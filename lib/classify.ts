import type { ActiveEmployee, ResignEmployee, Site, JobLevel, Position, ResignStatus } from "./types";

// Division column in active file → Site
export function divisionToSite(division: string): Site | null {
  const d = String(division || "").toLowerCase();
  if (d.includes("sp factory") || d.includes("10 [sp")) return "USP";
  if (d.includes("gp factory") || d.includes("30 [gp")) return "UGP";
  if (d.includes("corporate") || d.includes("20 [corp")) return "Corporate";
  return null; // UAT comes from separate file, already tagged
}

// Joblevel + Jobgrade → PPT Position
export function levelToPosition(joblevel: string, jobgrade: string, citizenship: string): Position {
  const lvl = String(joblevel || "").toLowerCase().trim();
  const grade = String(jobgrade || "").toUpperCase().trim();

  if (lvl === "management") {
    // Specialist Eng = SR/SPECIALIST ENG grade
    if (grade.startsWith("SM") || grade === "C/MD" || grade.startsWith("TM")) {
      // SM = Senior Manager / VP level → Management
      return "Management";
    }
    if (grade.startsWith("M") || grade === "M0") return "Management";
    return "Management";
  }

  if (lvl === "executive") {
    if (grade.startsWith("E5") || grade.startsWith("E4")) return "Section Head";
    if (grade.startsWith("E1") || grade.startsWith("E2") || grade.startsWith("E3")) return "Engineer";
    return "Other Exec";
  }

  if (lvl === "non executive") {
    if (grade.startsWith("S")) return "Supervisor";
    if (grade.startsWith("NE")) return "Technician";
    return "Other Non-Exec";
  }

  if (lvl === "operator") {
    // Foreign = non-Malaysian citizenship
    const cit = String(citizenship || "").toLowerCase();
    const isForeign = !cit.includes("malaysian");
    return isForeign ? "Operator (Foreign)" : "Operator (Local)";
  }

  // Trainee and unknowns → Non-Exec bucket
  return "Other Non-Exec";
}

// Determine Specialist Eng separately (SM-grade in Management level mapped to Spec Eng)
export function levelToPositionRefined(joblevel: string, jobgrade: string, jobtitle: string, citizenship: string): Position {
  const lvl = String(joblevel || "").toLowerCase().trim();
  const grade = String(jobgrade || "").toUpperCase().trim();
  const title = String(jobtitle || "").toLowerCase();

  if (lvl === "management") {
    if (title.includes("specialist") || grade === "SM1-E" || grade === "SM2-E") return "Specialist Eng";
    return "Management";
  }

  if (lvl === "executive") {
    if (grade.startsWith("E5") || grade.startsWith("E4")) return "Section Head";
    if (grade.startsWith("E1") || grade.startsWith("E2") || grade.startsWith("E3")) return "Engineer";
    return "Other Exec";
  }

  if (lvl === "non executive") {
    if (grade.startsWith("S")) return "Supervisor";
    // NE grades = Technician; others = Other Non-Exec
    if (grade.startsWith("NE")) return "Technician";
    return "Other Non-Exec";
  }

  if (lvl === "operator") {
    const cit = String(citizenship || "").toLowerCase();
    return cit.includes("malaysian") ? "Operator (Local)" : "Operator (Foreign)";
  }

  return "Other Non-Exec";
}

// Classify resign record into B-Current / B-Following / C-Status relative to report date
export function classifyResignStatus(payrollMonth: string, resignDate: string, reportDate: Date): ResignStatus {
  // payrollMonth: "Jun-2026", resignDate: "28-Jun-2026"
  const resign = parseFlexDate(resignDate);
  if (!resign) return "B-Following";

  const payrollParts = String(payrollMonth || "").split("-");
  const payrollYear = payrollParts[1] ? parseInt(payrollParts[1]) : reportDate.getFullYear();
  const payrollMonthNum = monthNameToNum(payrollParts[0]);

  const reportYear = reportDate.getFullYear();
  const reportMonth = reportDate.getMonth() + 1;

  // Already left (resign date in the past) → C Status
  if (resign < reportDate) return "C-Status";

  // Resign in current payroll month → B Current
  if (payrollYear === reportYear && payrollMonthNum === reportMonth) return "B-Current";

  // Future month → B Following
  return "B-Following";
}

function monthNameToNum(name: string): number {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  return months[String(name || "").toLowerCase().slice(0, 3)] ?? 1;
}

function parseFlexDate(d: string): Date | null {
  if (!d) return null;
  // Try formats: "28-Jun-2026", "2026-06-28", JS date serial
  const parts = String(d).split(/[-/]/);
  if (parts.length === 3) {
    // dd-Mon-yyyy
    if (isNaN(Number(parts[1]))) {
      const day = parseInt(parts[0]);
      const month = monthNameToNum(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year)) return new Date(year, month, day);
    }
    // yyyy-mm-dd
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }
  const ts = Date.parse(d);
  return isNaN(ts) ? null : new Date(ts);
}
