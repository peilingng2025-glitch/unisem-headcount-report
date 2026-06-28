"use client";
import type { ResignEmployee } from "@/lib/types";

const BRAND = "#800000";
const NAVY  = "#1a2035";

const MONTHS: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

function classifyStatus(payrollMonth: string, resignDate: string): { label: string; color: string; bg: string } {
  const parts = resignDate.split(/[-/]/);
  let resign: Date | null = null;
  if (parts.length === 3 && isNaN(Number(parts[1]))) {
    resign = new Date(parseInt(parts[2]), MONTHS[parts[1].toLowerCase().slice(0,3)] ?? 0, parseInt(parts[0]));
  }
  const today = new Date();

  if (resign && resign < today) return { label: "C Status", color: "#888", bg: "#f3f4f6" };

  const pmParts = payrollMonth.split("-");
  const pmYear = parseInt(pmParts[1] ?? "0");
  const pmMonth = MONTHS[pmParts[0]?.toLowerCase().slice(0,3) ?? ""] ?? 0;
  if (pmYear === today.getFullYear() && pmMonth === today.getMonth()) {
    return { label: "B — Current", color: "#c07000", bg: "#fffbeb" };
  }
  return { label: "B — Following", color: "#b58000", bg: "#fefce8" };
}

const SITE_COLORS: Record<string, string> = {
  USP: "#1e3a5f", UGP: "#1a5276", UAT: "#7d3c00", Corporate: "#4a235a",
};

interface Props { leavers: ResignEmployee[] }

export function MovementTable({ leavers }: Props) {
  if (leavers.length === 0) {
    return <p className="text-sm text-gray-400 italic px-6 py-4">No leavers recorded for this period.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "#e9ecf1" }} className="border-b-2 border-gray-300">
            <th className="text-left px-5 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Employee Name</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Section</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Job Title</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Level</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Site</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Last Day</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Payroll</th>
            <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-gray-800">Status</th>
          </tr>
        </thead>
        <tbody>
          {leavers.map((l, i) => {
            const { label, color, bg } = classifyStatus(l.payrollMonth, l.resignDate);
            return (
              <tr key={l.badge} className={i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                <td className="px-5 py-3 font-bold text-gray-900 text-sm">{l.name}</td>
                <td className="px-4 py-3 font-medium text-gray-700 text-sm">{l.section}</td>
                <td className="px-4 py-3 font-medium text-gray-700 text-sm">{l.jobtitle}</td>
                <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{l.jobLevel}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-sm font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: SITE_COLORS[l.site] ?? NAVY }}
                  >
                    {l.site}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{l.resignDate}</td>
                <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{l.payrollMonth}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-sm font-bold px-2.5 py-1 rounded-full"
                    style={{ color, background: bg }}
                  >
                    {label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
