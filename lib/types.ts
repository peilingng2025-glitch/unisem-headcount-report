export type Site = "Corporate" | "UGP" | "USP" | "UAT";
export type JobLevel = "Management" | "Executive" | "Non Executive" | "Operator" | "Trainee";
export type ResignStatus = "B-Current" | "B-Following" | "C-Status";

// Lightweight snapshot saved to localStorage after each upload for movement detection
export interface PrevEmployeeSnapshot {
  badge: string;
  name: string;
  site: Site;
  section: string;
  joblevel: string;
  jobgrade: string;
  jobtitle: string;
  citizenship: string;
}

export interface PrevResignSnapshot {
  badge: string;
  site: Site;
}

// Movement types tracked in the Transfer / Cert / Promo / Others column
export type MovementType =
  | "section-transfer"      // Operator transferred between sections (same site)
  | "site-transfer"         // Any employee transferred between sites
  | "category-change"       // Job level / category changed (e.g. Non-Exec → Executive)
  | "promotion"             // Job grade upgraded (grade/position changed upward)
  | "resignation-pullback"; // Employee withdrew resignation

export interface EmployeeMovement {
  type: MovementType;
  badge: string;
  name: string;
  site: Site;
  position: Position;
  fromSite?: Site;
  fromPosition?: Position;
  section?: string;
  fromSection?: string;
  joblevel?: string;
  fromJoblevel?: string;
  jobgrade?: string;
  fromJobgrade?: string;
}

export interface ActiveEmployee {
  badge: string;
  name: string;
  division: string;
  department: string;
  section: string;
  jobtitle: string;
  joblevel: JobLevel;
  jobgrade: string;
  citizenship: string;
  datejoin: string;
  lastWorkingDate: string | null;
}

export interface ResignEmployee {
  badge: string;
  name: string;
  section: string;
  jobtitle: string;
  jobLevel: JobLevel;
  pncDate: string;
  resignDate: string;
  payrollMonth: string;
  reason: string;
  site: Site;
}

// Positions as shown in the PPT / HC Report
export const POSITIONS = [
  "Management",
  "Specialist Eng",
  "Section Head",
  "Engineer",
  "Other Exec",
  "Supervisor",
  "Technician",
  "Other Non-Exec",
  "Operator (Local)",
  "Operator (Foreign)",
] as const;

export type Position = (typeof POSITIONS)[number];

export interface PositionCount {
  position: Position;
  prevTotal: number;
  add: number;
  resigned: number;
  transfer: number;
  currentTotal: number;
}

export interface SiteReport {
  site: Site;
  positions: PositionCount[];
  bStatusCurrent: number;
  bStatusFollowing: number;
  cStatus: number;
  activeTotal: number;
  payrollTotal: number;
}

export interface HeadcountReport {
  weekLabel: string;     // e.g. "WW26"
  prevWeekLabel: string; // e.g. "WW25"
  reportDate: string;    // e.g. "26-Jun-26"
  prevDate: string;
  sites: SiteReport[];
  overall: SiteReport;
  leavers: ResignEmployee[];
  joiners: (ActiveEmployee & { site: Site })[];
  movements: EmployeeMovement[];
}
