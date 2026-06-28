"use client";
import * as XLSX from "xlsx";
import type { ActiveEmployee, ResignEmployee, Site } from "./types";
import { divisionToSite } from "./classify";

function readSheet(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Parse active employee file (Corp+UGP+USP or UAT)
export async function parseActiveFile(file: File, defaultSite?: Site): Promise<(ActiveEmployee & { site: Site })[]> {
  const rows = await readSheet(file);
  return rows
    .map((r) => {
      const site = defaultSite ?? divisionToSite(r["Division"] ?? r["division"] ?? "") ?? "USP";
      return {
        badge: String(r["Badge"] ?? r["badge"] ?? ""),
        name: String(r["Name"] ?? r["name"] ?? ""),
        division: String(r["Division"] ?? r["division"] ?? ""),
        department: String(r["Department"] ?? r["department"] ?? ""),
        section: String(r["Section"] ?? r["section"] ?? ""),
        jobtitle: String(r["Jobtitle"] ?? r["jobtitle"] ?? r["Job Title"] ?? ""),
        joblevel: String(r["Joblevel"] ?? r["joblevel"] ?? r["Job Level"] ?? "") as ActiveEmployee["joblevel"],
        jobgrade: String(r["Jobgrade"] ?? r["jobgrade"] ?? r["Job Grade"] ?? ""),
        citizenship: String(r["Citizenship"] ?? r["citizenship"] ?? "MALAYSIAN"),
        datejoin: String(r["Datejoin"] ?? r["datejoin"] ?? r["Date Join"] ?? ""),
        lastWorkingDate: r["LastWorkingDate"] ?? r["lastWorkingDate"] ?? null,
        site,
      };
    })
    .filter((e) => {
      if (!e.badge) return false;
      // Exclude trainees (HR training section or TRAINEE job title)
      const section = (e.section ?? "").toUpperCase();
      const jobtitle = (e.jobtitle ?? "").toUpperCase();
      if (section.includes("TRAINING") || jobtitle.includes("TRAINEE")) return false;
      // Exclude employees who have a last working date (they belong in the resign file)
      if (e.lastWorkingDate && String(e.lastWorkingDate).trim() !== "") return false;
      return true;
    });
}

// Parse new joiner file (same columns as active, but NO trainee/lwd filter — all new joiners start in training)
export async function parseNewJoinFile(file: File, defaultSite?: Site): Promise<(ActiveEmployee & { site: Site })[]> {
  const rows = await readSheet(file);
  return rows
    .map((r) => {
      const site = defaultSite ?? divisionToSite(r["Division"] ?? r["division"] ?? "") ?? "USP";
      return {
        badge: String(r["Badge"] ?? r["badge"] ?? ""),
        name: String(r["Name"] ?? r["name"] ?? ""),
        division: String(r["Division"] ?? r["division"] ?? ""),
        department: String(r["Department"] ?? r["department"] ?? ""),
        section: String(r["Section"] ?? r["section"] ?? ""),
        jobtitle: String(r["Jobtitle"] ?? r["jobtitle"] ?? r["Job Title"] ?? ""),
        joblevel: String(r["Joblevel"] ?? r["joblevel"] ?? r["Job Level"] ?? "") as ActiveEmployee["joblevel"],
        jobgrade: String(r["Jobgrade"] ?? r["jobgrade"] ?? r["Job Grade"] ?? ""),
        citizenship: String(r["Citizenship"] ?? r["citizenship"] ?? "MALAYSIAN"),
        datejoin: String(r["Datejoin"] ?? r["datejoin"] ?? r["Date Join"] ?? ""),
        lastWorkingDate: r["LastWorkingDate"] ?? r["lastWorkingDate"] ?? null,
        site,
      };
    })
    .filter((e) => e.badge);
}

// Parse resign file for a given site
export async function parseResignFile(file: File, site: Site): Promise<ResignEmployee[]> {
  const rows = await readSheet(file);
  return rows
    .map((r) => ({
      badge: String(r["Badge"] ?? r["badge"] ?? ""),
      name: String(r["Name"] ?? r["name"] ?? ""),
      section: String(r["Section"] ?? r["section"] ?? ""),
      jobtitle: String(r["Job_Title"] ?? r["Jobtitle"] ?? r["Job Title"] ?? ""),
      jobLevel: String(r["Job_Level"] ?? r["Joblevel"] ?? r["Job Level"] ?? "") as ResignEmployee["jobLevel"],
      pncDate: String(r["PNCDate"] ?? r["pncDate"] ?? ""),
      resignDate: String(r["Resign_Date"] ?? r["ResignDate"] ?? r["resign_date"] ?? ""),
      payrollMonth: String(r["Payroll_Month"] ?? r["PayrollMonth"] ?? ""),
      reason: String(r["Reason"] ?? r["reason"] ?? ""),
      site,
    }))
    .filter((e) => e.badge);
}

// Parse previous HC Report Excel to extract per-site per-position totals (for WoW comparison)
export async function parsePrevHCReport(file: File): Promise<Record<Site, Record<string, number>>> {
  const data = await new Promise<Uint8Array>((res, rej) => {
    const reader = new FileReader();
    reader.onload = (e) => res(new Uint8Array(e.target!.result as ArrayBuffer));
    reader.onerror = rej;
    reader.readAsArrayBuffer(file);
  });
  const wb = XLSX.read(data, { type: "array" });

  const result: Record<Site, Record<string, number>> = {
    Corporate: {}, UGP: {}, USP: {}, UAT: {},
  };

  // Standard position names (lowercase) → canonical name
  const POSITION_MAP: Record<string, string> = {
    "management": "Management",
    "specialist eng": "Specialist Eng",
    "section head": "Section Head",
    "engineer": "Engineer",
    "other exec": "Other Exec",
    // Corporate-specific aliases
    "executive": "Other Exec",
    "others executive": "Other Exec",
    "supervisor": "Supervisor",
    "technician": "Technician",
    "other non-exec": "Other Non-Exec",
    "non-executive": "Other Non-Exec",
    "other non exec": "Other Non-Exec",
    "operator (local)": "Operator (Local)",
    "operator (foreign)": "Operator (Foreign)",
  };

  // Read Summary sheet (Corporate, UGP, USP)
  const ws = wb.Sheets["Summary"];
  if (ws) {
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
    let currentSection: Site | "Overall" | null = null;

    for (const row of rows) {
      const label = String(row[1] ?? "").toLowerCase().trim();
      if (label.includes("corporate headcount")) { currentSection = "Corporate"; continue; }
      if (label.includes("ugp headcount")) { currentSection = "UGP"; continue; }
      if (label.includes("usp headcount")) { currentSection = "USP"; continue; }
      if (label.includes("overall")) { currentSection = "Overall"; continue; }

      const canonical = POSITION_MAP[label];
      if (currentSection && currentSection !== "Overall" && canonical) {
        const total = Number(row[6] ?? 0);
        if (!isNaN(total)) result[currentSection][canonical] = total;
      }
    }
  }

  // Read UAT Headcount sheet if present (separate sheet in this report format)
  const wsUat = wb.Sheets["UAT Headcount"];
  if (wsUat) {
    const rows = XLSX.utils.sheet_to_json<string[]>(wsUat, { header: 1, defval: "" }) as string[][];
    // UAT sheet has sub-sections: MANAGEMENT, EXECUTIVE, NON-EXECUTIVE, OPERATOR
    // Each row: [empty, label/title, prev_total, add, resign, transfer, current_total]
    let inSection = false;
    for (const row of rows) {
      const label = String(row[1] ?? "").toLowerCase().trim();
      if (!label || label === "nan") continue;

      // Section headers — mark we're in data rows
      if (["management","executive","non-executive","operator"].includes(label)) {
        inSection = true; continue;
      }
      if (label.startsWith("total") || label.startsWith("b status") ||
          label.startsWith("active") || label.startsWith("c status")) {
        inSection = false; continue;
      }

      const canonical = POSITION_MAP[label];
      if (canonical) {
        const total = Number(row[6] ?? row[5] ?? 0);
        if (!isNaN(total)) result["UAT"][canonical] = (result["UAT"][canonical] ?? 0) + total;
      }
    }
  }

  return result;
}
