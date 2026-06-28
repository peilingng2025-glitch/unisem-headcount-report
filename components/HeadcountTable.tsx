"use client";
import type { SiteReport } from "@/lib/types";

const BRAND = "#800000";
const NAVY  = "#1a2035";

interface Props {
  report: SiteReport;
  prevWeekLabel: string;
  currentWeekLabel: string;
  prevDate: string;
  currentDate: string;
}

export function HeadcountTable({ report, prevWeekLabel, currentWeekLabel, prevDate, currentDate }: Props) {
  const total = report.positions.reduce(
    (s, p) => ({ prev: s.prev + p.prevTotal, add: s.add + p.add, resigned: s.resigned + p.resigned, current: s.current + p.currentTotal }),
    { prev: 0, add: 0, resigned: 0, current: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: NAVY, color: "#fff" }}>
            <th className="text-left px-5 py-3.5 font-bold text-sm uppercase tracking-wide w-44">Position</th>
            <th className="text-center px-4 py-3.5 font-bold text-sm">
              Total<br /><span className="font-medium text-blue-200 text-xs">{prevDate} ({prevWeekLabel})</span>
            </th>
            <th className="text-center px-4 py-3.5 font-bold text-sm">New Joiner</th>
            <th className="text-center px-4 py-3.5 font-bold text-sm">Resigned /<br />End Contract</th>
            <th className="text-center px-4 py-3.5 font-bold text-sm">Transfer / Cert /<br />Promo / Others</th>
            <th className="text-center px-4 py-3.5 font-bold text-sm" style={{ background: BRAND }}>
              Total<br /><span className="font-medium text-xs" style={{ color: "#ffaaaa" }}>{currentDate} ({currentWeekLabel})</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {report.positions.map((row, i) => (
            <tr key={row.position} className={i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
              <td className="px-5 py-3 font-semibold text-gray-900 text-sm">{row.position}</td>
              <td className="px-4 py-3 text-center font-medium text-gray-800 text-sm">{row.prevTotal || "—"}</td>
              <td className="px-4 py-3 text-center text-sm">
                {row.add > 0
                  ? <span className="font-bold text-green-800">{row.add}</span>
                  : <span className="text-gray-400 font-medium">—</span>
                }
              </td>
              <td className="px-4 py-3 text-center text-sm">
                {row.resigned > 0
                  ? <span className="font-bold" style={{ color: BRAND }}>{row.resigned}</span>
                  : <span className="text-gray-400 font-medium">—</span>
                }
              </td>
              <td className="px-4 py-3 text-center text-sm font-semibold">
                {row.transfer > 0
                  ? <span className="font-bold text-purple-700">+{row.transfer}</span>
                  : row.transfer < 0
                  ? <span className="font-bold" style={{ color: "#b45309" }}>{row.transfer}</span>
                  : <span className="text-gray-400 font-medium">—</span>
                }
              </td>
              <td className="px-4 py-3 text-center font-bold text-gray-900 text-base" style={{ background: "#fff0f0" }}>{row.currentTotal}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {/* Active total */}
          <tr className="border-t-2" style={{ borderColor: "#9ca3af", background: "#e9ecf1" }}>
            <td className="px-5 py-3 font-bold text-gray-900 text-sm uppercase tracking-wide">Total Active</td>
            <td className="px-4 py-3 text-center font-bold text-gray-800 text-sm">{total.prev || "—"}</td>
            <td className="px-4 py-3 text-center font-bold text-green-800 text-sm">{total.add || "—"}</td>
            <td className="px-4 py-3 text-center font-bold text-sm" style={{ color: BRAND }}>{total.resigned || "—"}</td>
            <td className="px-4 py-3 text-center font-bold text-sm text-purple-700">
              {report.positions.reduce((s, p) => s + p.transfer, 0) !== 0
                ? `${report.positions.reduce((s, p) => s + p.transfer, 0) > 0 ? "+" : ""}${report.positions.reduce((s, p) => s + p.transfer, 0)}`
                : "—"}
            </td>
            <td className="px-4 py-3 text-center font-bold text-lg" style={{ background: "#fff0f0", color: BRAND }}>{report.activeTotal}</td>
          </tr>
          {/* B/C status rows */}
          {[
            { label: "+ B Status — Current Month (Serving Notice)", val: report.bStatusCurrent, color: "#a05000" },
            { label: "+ B Status — Following Months", val: report.bStatusFollowing, color: "#8a6800" },
            { label: "+ C Status — Left Already (still in payroll)", val: report.cStatus, color: "#4b5563" },
          ].map(({ label, val, color }) => (
            <tr key={label} className="bg-white border-t border-gray-200">
              <td className="px-5 py-2 text-sm font-semibold italic" style={{ color }} colSpan={5}>{label}</td>
              <td className="px-4 py-2 text-center text-base font-bold" style={{ color, background: "#fff8f0" }}>{val}</td>
            </tr>
          ))}
          {/* Payroll total */}
          <tr style={{ background: NAVY }}>
            <td className="px-5 py-3.5 font-bold text-white text-sm uppercase tracking-wide" colSpan={5}>
              Total Payroll Headcount
            </td>
            <td className="px-4 py-3.5 text-center font-bold text-xl text-white" style={{ background: BRAND }}>
              {report.payrollTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
