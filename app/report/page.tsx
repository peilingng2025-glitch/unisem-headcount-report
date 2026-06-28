"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, TrendingDown, TrendingUp, Users, Building2, RefreshCw, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeadcountTable } from "@/components/HeadcountTable";
import { MovementTable } from "@/components/MovementTable";
import { MovementsSection } from "@/components/MovementsSection";
import { MOCK_REPORT } from "@/lib/mock-data";
import type { HeadcountReport, SiteReport } from "@/lib/types";

const BRAND = "#800000";
const NAVY  = "#1a2035";

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}
function KpiCard({ label, value, sub, accent, icon }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm p-5 flex flex-col gap-1"
      style={{ borderTop: `4px solid ${accent ? BRAND : "#d1d5db"}` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-bold uppercase tracking-wider text-gray-700">{label}</span>
        {icon && <span style={{ color: accent ? BRAND : "#6b7280" }}>{icon}</span>}
      </div>
      <span className="text-3xl font-bold" style={{ color: accent ? BRAND : "#111827" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {sub && <span className="text-sm font-semibold text-gray-600">{sub}</span>}
    </div>
  );
}

interface StatusPillProps { label: string; value: number; color: string; bg: string; hint: string }
function StatusPill({ label, value, color, bg, hint }: StatusPillProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm px-5 py-4" style={{ borderLeft: `5px solid ${color}` }}>
      <p className="text-sm font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{hint}</p>
    </div>
  );
}

type PublishState = "idle" | "publishing" | "done" | "error";

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<HeadcountReport | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hc_report");
    if (stored) {
      try { setReport(JSON.parse(stored)); }
      catch { setReport(MOCK_REPORT); setUseMock(true); }
    } else {
      setReport(MOCK_REPORT);
      setUseMock(true);
    }
  }, []);

  async function handlePublish() {
    if (!report || useMock) return;
    setPublishState("publishing");
    setPublishError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Unknown error");
      setPublishState("done");
    } catch (err) {
      setPublishState("error");
      setPublishError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: BRAND }} />
      </div>
    );
  }

  const overallNet = report.overall.activeTotal - report.overall.positions.reduce((s, p) => s + p.prevTotal, 0);
  const totalJoiners = report.joiners.length;
  const totalLeavers = report.overall.positions.reduce((s, p) => s + p.resigned, 0);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">

      {/* ── Header ── */}
      <header style={{ background: NAVY }} className="print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/generate")}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Upload
            </button>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-7 rounded-full" style={{ background: BRAND }} />
              <span className="text-base font-bold text-white">Headcount Report System</span>
              <span className="text-sm px-2.5 py-0.5 rounded-full font-bold" style={{ background: "#2e3d5e", color: "#c8d8f0" }}>
                {report.weekLabel}
              </span>
              {useMock && (
                <span className="text-sm px-2.5 py-0.5 rounded-full font-bold bg-amber-900/40 text-amber-300">
                  Sample Data
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/generate")}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded border transition-colors text-gray-300 hover:text-white"
              style={{ borderColor: "#2e3d5e" }}
            >
              <RefreshCw size={14} /> New Report
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded text-white transition-opacity hover:opacity-90"
              style={{ background: "#1a6b35" }}
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={handleExportPPT}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded text-white transition-opacity hover:opacity-90"
              style={{ background: BRAND }}
            >
              <Download size={14} /> PowerPoint
            </button>
            <button
              onClick={handlePublish}
              disabled={useMock || publishState === "publishing"}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: publishState === "done" ? "#1a6b35" : "#1a2e5e" }}
              title={useMock ? "Cannot publish sample data" : "Publish this report for management to view"}
            >
              {publishState === "publishing" ? (
                <><span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" /> Publishing…</>
              ) : publishState === "done" ? (
                <><CheckCircle size={14} /> Published</>
              ) : (
                <><Send size={14} /> Publish</>
              )}
            </button>
          </div>
        </div>
      </header>

      {publishState === "error" && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2 text-sm text-red-700 print:hidden">
          <AlertCircle size={15} />
          <strong>Publish failed:</strong> {publishError}
        </div>
      )}
      {publishState === "done" && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2 text-sm text-green-700 print:hidden">
          <CheckCircle size={15} />
          Report published. Management can now view it at <strong>/published</strong>.
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Report title ── */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">UM Headcount Overview — {report.weekLabel}</h2>
          <p className="text-base font-medium text-gray-700 mt-1">
            As at {report.reportDate} &nbsp;|&nbsp; Compared to {report.prevDate} ({report.prevWeekLabel})
          </p>
        </div>

        {/* ── Payroll Run Summary KPI row ── */}
        <div className="mb-3">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Payroll Run Summary</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label="Total Payroll"
            value={report.overall.payrollTotal}
            sub={`${overallNet >= 0 ? "+" : ""}${overallNet} vs ${report.prevWeekLabel}`}
            accent
            icon={<Users size={18} />}
          />
          {report.sites.map((sr) => (
            <KpiCard
              key={sr.site}
              label={`${sr.site} Headcount`}
              value={sr.payrollTotal}
              sub={`Active: ${sr.activeTotal}`}
              icon={<Building2 size={16} />}
            />
          ))}
        </div>

        {/* ── B / C Status strip ── */}
        <div className="mb-3">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Resignation Status (Included in Payroll)</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatusPill
            label="B Status — Current Month"
            value={report.overall.bStatusCurrent}
            color="#c07000"
            bg="#fffbeb"
            hint="Serving notice, leaving this month"
          />
          <StatusPill
            label="B Status — Following Months"
            value={report.overall.bStatusFollowing}
            color="#b58000"
            bg="#fefce8"
            hint="Serving notice, leaving next month+"
          />
          <StatusPill
            label="C Status — Left Already"
            value={report.overall.cStatus}
            color="#666"
            bg="#f9fafb"
            hint="Left, still in this month's payroll"
          />
        </div>

        {/* ── Headcount by Position table ── */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden" style={{ borderTop: `4px solid ${BRAND}` }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="brand-bar text-base font-bold text-gray-900 uppercase tracking-wide">
              Headcount by Position
            </h3>
          </div>
          <Tabs defaultValue="overall">
            <div className="px-6 border-b border-gray-100">
              <TabsList className="h-9 bg-transparent gap-0 p-0">
                {["overall", "Corporate", "UGP", "USP", "UAT"].map((t) => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#800000] data-[state=active]:bg-transparent data-[state=active]:text-[#800000] text-gray-700 text-sm px-4 h-10 font-bold"
                  >
                    {t === "overall" ? "UM Overall" : t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="overall" className="mt-0">
              <HeadcountTable
                report={report.overall}
                prevWeekLabel={report.prevWeekLabel}
                currentWeekLabel={report.weekLabel}
                prevDate={report.prevDate}
                currentDate={report.reportDate}
              />
            </TabsContent>
            {report.sites.map((sr) => (
              <TabsContent key={sr.site} value={sr.site} className="mt-0">
                <HeadcountTable
                  report={sr}
                  prevWeekLabel={report.prevWeekLabel}
                  currentWeekLabel={report.weekLabel}
                  prevDate={report.prevDate}
                  currentDate={report.reportDate}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* ── Movement / Resignation ── */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ borderTop: `4px solid ${BRAND}` }}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="brand-bar text-base font-bold text-gray-900 uppercase tracking-wide">
              Resignation &amp; Movement
            </h3>
            <div className="flex gap-5 text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={15} className="text-green-600" />
                Joiners: <strong className="text-green-700">{totalJoiners}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingDown size={15} style={{ color: BRAND }} />
                Leavers: <strong style={{ color: BRAND }}>{totalLeavers}</strong>
              </span>
            </div>
          </div>
          <MovementTable leavers={report.leavers} />
        </div>

        <MovementsSection movements={report.movements ?? []} />

      </main>
    </div>
  );
}

async function handleExportExcel() {
  const stored = localStorage.getItem("hc_report");
  if (!stored) return;
  const report: HeadcountReport = JSON.parse(stored);
  const { exportToExcel } = await import("@/lib/export-excel");
  await exportToExcel(report);
}

async function handleExportPPT() {
  const stored = localStorage.getItem("hc_report");
  if (!stored) return;
  const report: HeadcountReport = JSON.parse(stored);
  const { exportToPPT } = await import("@/lib/export-ppt");
  exportToPPT(report);
}
