"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseActiveFile, parseResignFile, parsePrevHCReport } from "@/lib/parse";
import { buildReport } from "@/lib/report";
import type { Site, Position, PrevEmployeeSnapshot, PrevResignSnapshot } from "@/lib/types";

interface UploadSlot {
  id: string;
  label: string;
  hint: string;
  required: boolean;
  file: File | null;
}

const INITIAL_SLOTS: UploadSlot[] = [
  { id: "active-main", label: "Active Employees (Corp + UGP + USP)", hint: "Active_WW##.xlsx", required: true, file: null },
  { id: "active-uat", label: "Active Employees (UAT)", hint: "UAT Active_WW##.xlsx", required: true, file: null },
  { id: "resign-usp", label: "USP Resign Listing", hint: "USP Resign WW##.xlsx", required: true, file: null },
  { id: "resign-ugp", label: "UGP Resign Listing", hint: "UGP Resign WW##.xlsx", required: true, file: null },
  { id: "resign-uat", label: "UAT Resign Listing", hint: "UAT Resign WW##.xlsx", required: false, file: null },
  { id: "prev-report", label: "Previous Week HC Report (optional)", hint: "HC Report 2026WW##.xlsx — for WoW comparison", required: false, file: null },
  { id: "prev-active", label: "Previous Week Active List (optional)", hint: "Active_WW##.xlsx — enables transfer & movement detection", required: false, file: null },
];

// Unisem WW calendar: weeks run Sunday → Saturday.
// WW01 starts Jan 1 regardless of day of week.
// Formula: week = floor((dayOfYear + jan1DayOfWeek) / 7) + 1
function wwFromDate(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const jan1Dow = jan1.getDay(); // 0=Sun … 6=Sat
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.floor((dayOfYear + jan1Dow) / 7) + 1;
  return `WW${String(weekNum).padStart(2, "0")}`;
}

// Report date is always the Friday of the current Unisem week.
// Default = most recent Friday (0 days if today is Fri, 1 if Sat, 2 if Sun, etc.)
function mostRecentFriday(d: Date): Date {
  const friday = new Date(d);
  const daysSinceFriday = (d.getDay() - 5 + 7) % 7; // 0=Fri,1=Sat,2=Sun,3=Mon,4=Tue,5=Wed,6=Thu
  friday.setDate(d.getDate() - daysSinceFriday);
  return friday;
}

export default function UploadPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<UploadSlot[]>(INITIAL_SLOTS);
  const [wwInput, setWwInput] = useState(() => wwFromDate(mostRecentFriday(new Date())));
  const [reportDate, setReportDate] = useState(() => {
    const f = mostRecentFriday(new Date());
    return f.toISOString().slice(0, 10);
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setFile = useCallback((id: string, file: File) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, file } : s)));
  }, []);

  const handleDrop = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) setFile(id, file);
  };

  const requiredFilled = slots.filter((s) => s.required).every((s) => s.file !== null);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const get = (id: string) => slots.find((s) => s.id === id)?.file ?? null;

      const activeMain = get("active-main")!;
      const activeUat = get("active-uat")!;
      const resignUsp = get("resign-usp")!;
      const resignUgp = get("resign-ugp")!;
      const resignUat = get("resign-uat");
      const prevReport = get("prev-report");
      const prevActive = get("prev-active");

      const [mainEmps, uatEmps, uspResign, ugpResign, uatResign, prevActiveEmps] = await Promise.all([
        parseActiveFile(activeMain),
        parseActiveFile(activeUat, "UAT"),
        parseResignFile(resignUsp, "USP"),
        parseResignFile(resignUgp, "UGP"),
        resignUat ? parseResignFile(resignUat, "UAT") : Promise.resolve([]),
        prevActive ? parseActiveFile(prevActive) : Promise.resolve(null),
      ]);

      const allActive = [...mainEmps, ...uatEmps];
      const allResign = [...uspResign, ...ugpResign, ...uatResign];

      let prevTotals: Record<Site, Record<Position, number>> = {
        Corporate: {} as Record<Position, number>,
        UGP: {} as Record<Position, number>,
        USP: {} as Record<Position, number>,
        UAT: {} as Record<Position, number>,
      };

      if (prevReport) {
        const raw = await parsePrevHCReport(prevReport);
        for (const site of ["Corporate", "UGP", "USP", "UAT"] as Site[]) {
          for (const [k, v] of Object.entries(raw[site])) {
            const pos = k.replace(/\b\w/g, (c) => c.toUpperCase()) as Position;
            prevTotals[site][pos] = v;
          }
        }
      } else {
        const cached = localStorage.getItem("hc_prev_totals");
        if (cached) prevTotals = JSON.parse(cached);
      }

      // Load previous employee snapshot for movement detection
      let prevEmployees: PrevEmployeeSnapshot[] = [];
      let prevResign: PrevResignSnapshot[] = [];
      if (prevActiveEmps) {
        // File provided — use it directly (overrides localStorage)
        prevEmployees = prevActiveEmps.map((e) => ({
          badge: e.badge,
          name: e.name,
          site: e.site,
          section: e.section ?? "",
          joblevel: e.joblevel,
          jobgrade: e.jobgrade ?? "",
          jobtitle: e.jobtitle ?? "",
          citizenship: e.citizenship ?? "",
        }));
        // No prev resign data available from this file — keep empty for first run
      } else {
        try {
          const pe = localStorage.getItem("hc_prev_employees");
          const pr = localStorage.getItem("hc_prev_resign");
          if (pe) prevEmployees = JSON.parse(pe);
          if (pr) prevResign = JSON.parse(pr);
        } catch { /* ignore parse errors */ }
      }

      const prevWW = `WW${String(parseInt(wwInput.replace("WW", "")) - 1).padStart(2, "0")}`;
      const date = new Date(reportDate);

      const report = buildReport({
        activeEmployees: allActive,
        resignEmployees: allResign,
        prevTotals,
        prevEmployees,
        prevResign,
        reportDate: date,
        weekLabel: wwInput,
        prevWeekLabel: prevWW,
      });

      const currentTotals: Record<Site, Record<Position, number>> = {
        Corporate: {} as Record<Position, number>,
        UGP: {} as Record<Position, number>,
        USP: {} as Record<Position, number>,
        UAT: {} as Record<Position, number>,
      };
      for (const sr of report.sites) {
        for (const pc of sr.positions) {
          currentTotals[sr.site][pc.position] = pc.currentTotal;
        }
      }
      localStorage.setItem("hc_prev_totals", JSON.stringify(currentTotals));

      // Save full employee + resign snapshots for next week's movement detection
      const empSnapshot: PrevEmployeeSnapshot[] = allActive.map((e) => ({
        badge: e.badge,
        name: e.name,
        site: e.site,
        section: e.section ?? "",
        joblevel: e.joblevel,
        jobgrade: e.jobgrade ?? "",
        jobtitle: e.jobtitle ?? "",
        citizenship: e.citizenship ?? "",
      }));
      const resignSnapshot: PrevResignSnapshot[] = allResign.map((r) => ({
        badge: r.badge,
        site: r.site,
      }));
      localStorage.setItem("hc_prev_employees", JSON.stringify(empSnapshot));
      localStorage.setItem("hc_prev_resign", JSON.stringify(resignSnapshot));

      localStorage.setItem("hc_report", JSON.stringify(report));

      router.push("/report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred processing your files.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {/* ── Header ── */}
      <header style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-9 rounded-full" style={{ background: "var(--brand)" }} />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Headcount Report System</h1>
              <p className="text-sm font-medium" style={{ color: "#a8b8d8" }}>Unisem Group &nbsp;|&nbsp; HR People Analytics</p>
            </div>
          </div>
          <span className="text-sm px-3 py-1 rounded-full border font-semibold" style={{ color: "#c8d8f0", borderColor: "#2e3d5e" }}>
            WW Report Generator
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Report Period card ── */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden card-brand-top">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="brand-bar text-base font-bold text-gray-900 uppercase tracking-wide">Report Period</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex gap-8 items-end flex-wrap">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Work Week</label>
                <input
                  type="text"
                  value={wwInput}
                  onChange={(e) => setWwInput(e.target.value)}
                  className="w-32 border border-gray-300 rounded px-3 py-2.5 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#800000]/40 focus:border-[#800000]"
                  placeholder="WW26"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Report Date</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#800000]/40 focus:border-[#800000]"
                />
              </div>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-1.5 pb-1">
                <Info size={14} /> Week runs Sun – Sat · Report date = Friday · WW01 starts 1 Jan
              </p>
            </div>
          </div>
        </div>

        {/* ── File Upload card ── */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden card-brand-top">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="brand-bar text-base font-bold text-gray-900 uppercase tracking-wide">Upload HRMS Files</h2>
            <p className="text-sm font-medium text-gray-600 mt-1 ml-4">
              Fields marked <span className="font-bold" style={{ color: "var(--brand)" }}>*</span> are required
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`relative border-2 border-dashed rounded-lg p-5 transition-all cursor-pointer
                  ${dragOver === slot.id
                    ? "border-[#800000] bg-red-50"
                    : slot.file
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white"
                  }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(slot.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(slot.id, e)}
                onClick={() => fileRefs.current[slot.id]?.click()}
              >
                <input
                  ref={(el) => { fileRefs.current[slot.id] = el; }}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(slot.id, f); }}
                />
                <div className="flex items-start gap-3">
                  <FileSpreadsheet
                    size={22}
                    className={slot.file ? "text-green-600 mt-0.5 flex-shrink-0" : "mt-0.5 flex-shrink-0"}
                    style={slot.file ? {} : { color: "#4b5563" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-900 truncate">{slot.label}</p>
                      {slot.required && <span className="text-base font-bold leading-none" style={{ color: "var(--brand)" }}>*</span>}
                    </div>
                    <p className="text-sm font-medium mt-1 truncate" style={{ color: slot.file ? "#166534" : "#374151" }}>
                      {slot.file ? slot.file.name : slot.hint}
                    </p>
                  </div>
                  {slot.file
                    ? <span className="text-sm bg-green-100 text-green-800 px-2.5 py-1 rounded-full flex-shrink-0 font-bold">✓ Loaded</span>
                    : <Upload size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#6b7280" }} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!requiredFilled || processing}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-lg text-base font-bold tracking-wide transition-all"
          style={requiredFilled && !processing
            ? { background: "var(--brand)", color: "#fff" }
            : { background: "#d1d5db", color: "#6b7280", cursor: "not-allowed" }
          }
        >
          {processing ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Processing files…
            </>
          ) : (
            <>
              Generate Headcount Report
              <ChevronRight size={18} />
            </>
          )}
        </button>

        <p className="text-center text-sm font-medium text-gray-600 mt-3">
          All files are processed locally in your browser — nothing is uploaded to any server.
        </p>
      </main>
    </div>
  );
}
