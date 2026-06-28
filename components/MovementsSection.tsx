"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { EmployeeMovement, MovementType } from "@/lib/types";

const BRAND = "#800000";
const NAVY  = "#1a2035";

const SITE_COLORS: Record<string, string> = {
  USP: "#1e3a5f", UGP: "#1a5276", UAT: "#7d3c00", Corporate: "#4a235a",
};

const TYPE_CONFIG: Record<MovementType, {
  label: string;
  color: string;
  bg: string;
  description: string;
}> = {
  "section-transfer":    { label: "Operator Section Transfer",  color: "#0369a1", bg: "#e0f2fe", description: "Operators transferred between sections within the same site" },
  "site-transfer":       { label: "Site Transfer",              color: "#7c3aed", bg: "#f3e8ff", description: "Employees transferred between sites (e.g. USP → UGP)" },
  "category-change":     { label: "Category Change",            color: "#b45309", bg: "#fef3c7", description: "Employees whose job level / category changed" },
  "promotion":           { label: "Promotion",                  color: "#166534", bg: "#dcfce7", description: "Employees who received a grade or position upgrade" },
  "resignation-pullback":{ label: "Resignation Pullback",       color: BRAND,     bg: "#fff0f0", description: "Employees who withdrew their resignation and are staying" },
};

const ORDER: MovementType[] = [
  "section-transfer",
  "site-transfer",
  "category-change",
  "promotion",
  "resignation-pullback",
];

function MovementRow({ mv }: { mv: EmployeeMovement }) {
  const cfg = TYPE_CONFIG[mv.type];

  let change = "";
  if (mv.type === "site-transfer") {
    change = `${mv.fromSite ?? "?"} → ${mv.site}`;
    if (mv.fromPosition && mv.fromPosition !== mv.position)
      change += ` · ${mv.fromPosition} → ${mv.position}`;
  } else if (mv.type === "section-transfer") {
    change = `${mv.fromSection ?? "?"} → ${mv.section ?? "?"}`;
  } else if (mv.type === "category-change") {
    change = `${mv.fromJoblevel ?? mv.fromPosition ?? "?"} → ${mv.joblevel ?? mv.position}`;
  } else if (mv.type === "promotion") {
    change = `${mv.fromJobgrade ?? "?"} → ${mv.jobgrade ?? "?"}`;
    if (mv.fromPosition && mv.fromPosition !== mv.position)
      change += ` (${mv.fromPosition} → ${mv.position})`;
  } else if (mv.type === "resignation-pullback") {
    change = "Withdrew resignation";
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3 font-bold text-gray-900 text-sm">{mv.name}</td>
      <td className="px-4 py-3">
        <span
          className="text-sm font-bold px-2.5 py-0.5 rounded-full text-white"
          style={{ background: SITE_COLORS[mv.site] ?? NAVY }}
        >
          {mv.site}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{mv.position}</td>
      <td className="px-4 py-3 text-sm font-semibold" style={{ color: cfg.color }}>{change}</td>
    </tr>
  );
}

function MovementPanel({ type, items }: { type: MovementType; items: EmployeeMovement[] }) {
  const [open, setOpen] = useState(true);
  const cfg = TYPE_CONFIG[type];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
        style={{ background: open ? cfg.bg : "#fff" }}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} style={{ color: cfg.color }} /> : <ChevronRight size={16} style={{ color: cfg.color }} />}
          <span className="text-sm font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span
            className="text-sm font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: cfg.color, color: "#fff" }}
          >
            {items.length}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-500 hidden sm:block">{cfg.description}</span>
      </button>

      {open && (
        items.length === 0 ? (
          <p className="px-5 py-4 text-sm font-medium text-gray-500 italic">No {cfg.label.toLowerCase()} recorded this week.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th className="text-left px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700">Employee</th>
                  <th className="text-left px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700">Site</th>
                  <th className="text-left px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700">Position</th>
                  <th className="text-left px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700">Change</th>
                </tr>
              </thead>
              <tbody>
                {items.map((mv) => <MovementRow key={mv.badge + mv.type} mv={mv} />)}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

interface Props {
  movements: EmployeeMovement[];
}

export function MovementsSection({ movements }: Props) {
  const total = movements.length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6" style={{ borderTop: `4px solid ${BRAND}` }}>
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="brand-bar text-base font-bold text-gray-900 uppercase tracking-wide">
            Transfer / Cert / Promotion / Others
          </h3>
          <p className="text-sm font-medium text-gray-600 mt-1 ml-[14px]">
            Internal movements detected this week vs previous week snapshot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Total movements:</span>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full text-white"
            style={{ background: total > 0 ? BRAND : "#6b7280" }}
          >
            {total}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="px-6 py-6 text-center">
          <p className="text-sm font-semibold text-gray-500">
            No movements detected.
          </p>
          <p className="text-sm font-medium text-gray-400 mt-1">
            Upload two consecutive weeks of HRMS files to enable movement tracking.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {ORDER.map((type) => (
            <MovementPanel
              key={type}
              type={type}
              items={movements.filter((m) => m.type === type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
