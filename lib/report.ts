import { POSITIONS, type ActiveEmployee, type EmployeeMovement, type HeadcountReport, type Position, type PositionCount, type PrevEmployeeSnapshot, type PrevResignSnapshot, type ResignEmployee, type Site, type SiteReport } from "./types";
import { classifyResignStatus, divisionToSite, levelToPositionRefined } from "./classify";

const SITES: Site[] = ["Corporate", "UGP", "USP", "UAT"];

function emptyPositionCounts(): PositionCount[] {
  return POSITIONS.map((p) => ({
    position: p,
    prevTotal: 0,
    add: 0,
    resigned: 0,
    transfer: 0,
    currentTotal: 0,
  }));
}

function emptySiteReport(site: Site): SiteReport {
  return {
    site,
    positions: emptyPositionCounts(),
    bStatusCurrent: 0,
    bStatusFollowing: 0,
    cStatus: 0,
    activeTotal: 0,
    payrollTotal: 0,
  };
}

function sumPositions(reports: SiteReport[]): SiteReport["positions"] {
  const result = emptyPositionCounts();
  for (const r of reports) {
    r.positions.forEach((pc, i) => {
      result[i].prevTotal += pc.prevTotal;
      result[i].add += pc.add;
      result[i].resigned += pc.resigned;
      result[i].transfer += pc.transfer;
      result[i].currentTotal += pc.currentTotal;
    });
  }
  return result;
}

export function buildReport(params: {
  activeEmployees: (ActiveEmployee & { site: Site })[];
  resignEmployees: ResignEmployee[];
  prevTotals: Record<Site, Record<Position, number>>;
  prevEmployees?: PrevEmployeeSnapshot[];
  prevResign?: PrevResignSnapshot[];
  reportDate: Date;
  weekLabel: string;
  prevWeekLabel: string;
}): HeadcountReport {
  const { activeEmployees, resignEmployees, prevTotals, prevEmployees, prevResign, reportDate, weekLabel, prevWeekLabel } = params;

  const siteMap: Record<Site, SiteReport> = {
    Corporate: emptySiteReport("Corporate"),
    UGP: emptySiteReport("UGP"),
    USP: emptySiteReport("USP"),
    UAT: emptySiteReport("UAT"),
  };

  // Count current active headcount per site/position
  const currentCounts: Record<Site, Record<Position, number>> = {
    Corporate: {} as Record<Position, number>,
    UGP: {} as Record<Position, number>,
    USP: {} as Record<Position, number>,
    UAT: {} as Record<Position, number>,
  };
  for (const pos of POSITIONS) {
    for (const site of SITES) currentCounts[site][pos] = 0;
  }

  // Track joiners (joined this week)
  const weekStart = new Date(reportDate);
  weekStart.setDate(weekStart.getDate() - 6); // 7-day window

  const joiners: ActiveEmployee[] = [];

  for (const emp of activeEmployees) {
    const pos = levelToPositionRefined(emp.joblevel, emp.jobgrade, emp.jobtitle, emp.citizenship);
    currentCounts[emp.site][pos]++;

    // Joiner = datejoin within this week
    const joined = parseFlexDate(emp.datejoin);
    if (joined && joined >= weekStart && joined <= reportDate) {
      joiners.push(emp);
    }
  }

  // Count resign statuses per site
  const resignCounts: Record<Site, { bCurrent: number; bFollowing: number; cStatus: number; byPosition: Record<Position, number> }> = {
    Corporate: { bCurrent: 0, bFollowing: 0, cStatus: 0, byPosition: {} as Record<Position, number> },
    UGP: { bCurrent: 0, bFollowing: 0, cStatus: 0, byPosition: {} as Record<Position, number> },
    USP: { bCurrent: 0, bFollowing: 0, cStatus: 0, byPosition: {} as Record<Position, number> },
    UAT: { bCurrent: 0, bFollowing: 0, cStatus: 0, byPosition: {} as Record<Position, number> },
  };
  for (const pos of POSITIONS) {
    for (const site of SITES) resignCounts[site].byPosition[pos] = 0;
  }

  for (const r of resignEmployees) {
    const site = r.site;
    const status = classifyResignStatus(r.payrollMonth, r.resignDate, reportDate);
    if (status === "B-Current") resignCounts[site].bCurrent++;
    else if (status === "B-Following") resignCounts[site].bFollowing++;
    else resignCounts[site].cStatus++;

    // Count resigned movement — employees who left this week (C-status with resign date in this week)
    const pos = levelToPositionRefined(r.jobLevel, "", r.jobtitle, "");
    resignCounts[site].byPosition[pos]++;
  }

  // Detect movements if previous snapshot is available
  const movements = detectMovements(activeEmployees, resignEmployees, prevEmployees ?? [], prevResign ?? []);

  // Compute per-site transfer counts from movements (net into each site+position)
  const transferCounts: Record<Site, Record<Position, number>> = {
    Corporate: {} as Record<Position, number>,
    UGP: {} as Record<Position, number>,
    USP: {} as Record<Position, number>,
    UAT: {} as Record<Position, number>,
  };
  for (const pos of POSITIONS) {
    for (const site of SITES) transferCounts[site][pos] = 0;
  }
  for (const mv of movements) {
    if (mv.type === "section-transfer" || mv.type === "resignation-pullback") continue;
    // Only count if something actually changed at position/site level
    if (!mv.fromPosition && !mv.fromSite) continue;
    // Outbound from previous position/site
    if (mv.fromPosition && mv.fromSite) {
      transferCounts[mv.fromSite][mv.fromPosition] = (transferCounts[mv.fromSite][mv.fromPosition] ?? 0) - 1;
    } else if (mv.fromPosition) {
      transferCounts[mv.site][mv.fromPosition] = (transferCounts[mv.site][mv.fromPosition] ?? 0) - 1;
    }
    // Inbound to current position/site
    transferCounts[mv.site][mv.position] = (transferCounts[mv.site][mv.position] ?? 0) + 1;
  }

  // Build per-site reports
  for (const site of SITES) {
    const sr = siteMap[site];
    const prev = prevTotals[site] ?? ({} as Record<Position, number>);
    const rc = resignCounts[site];

    sr.positions = POSITIONS.map((pos) => {
      const prevTotal = prev[pos] ?? 0;
      const currentTotal = currentCounts[site][pos];
      const resigned = rc.byPosition[pos];
      const transfer = transferCounts[site][pos] ?? 0;
      // add = net new joiners (current - prev + resigned - net transfers)
      const add = Math.max(0, currentTotal - prevTotal + resigned - transfer);
      return {
        position: pos,
        prevTotal,
        add,
        resigned,
        transfer,
        currentTotal,
      };
    });

    sr.activeTotal = POSITIONS.reduce((s, p) => s + currentCounts[site][p], 0);
    sr.bStatusCurrent = rc.bCurrent;
    sr.bStatusFollowing = rc.bFollowing;
    sr.cStatus = rc.cStatus;
    sr.payrollTotal = sr.activeTotal + rc.bCurrent + rc.bFollowing + rc.cStatus;
  }

  // Build overall (sum of all sites)
  const overallSr: SiteReport = {
    site: "Corporate", // placeholder, displayed as "UM Overall"
    positions: sumPositions(Object.values(siteMap)),
    bStatusCurrent: SITES.reduce((s, site) => s + siteMap[site].bStatusCurrent, 0),
    bStatusFollowing: SITES.reduce((s, site) => s + siteMap[site].bStatusFollowing, 0),
    cStatus: SITES.reduce((s, site) => s + siteMap[site].cStatus, 0),
    activeTotal: SITES.reduce((s, site) => s + siteMap[site].activeTotal, 0),
    payrollTotal: SITES.reduce((s, site) => s + siteMap[site].payrollTotal, 0),
  };

  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en", { month: "short" })}-${String(d.getFullYear()).slice(2)}`;

  const prevDateObj = new Date(reportDate);
  prevDateObj.setDate(prevDateObj.getDate() - 7);

  return {
    weekLabel,
    prevWeekLabel,
    reportDate: formatDate(reportDate),
    prevDate: formatDate(prevDateObj),
    sites: SITES.map((s) => siteMap[s]),
    overall: overallSr,
    leavers: resignEmployees,
    joiners: joiners as (ActiveEmployee & { site: Site })[],
    movements,
  };
}

// Grade ordering for promotion detection — higher index = higher grade
const GRADE_ORDER: Record<string, number> = {
  O1: 1, O2: 2,
  NE1: 10, NE2: 11, NE3: 12, NE4: 13, NE5: 14, NE6: 15, NE7: 16,
  S1: 20, S2: 21, S3: 22, S4: 23, S5: 24,
  E1: 30, E2: 31, E3: 32, E4: 33, E5: 34,
  M0: 40, M1: 41, M2: 42, M3: 43,
  SM1: 50, "SM1-E": 51, SM2: 52, "SM2-E": 53, SM3: 54,
};

function gradeRank(g: string): number {
  return GRADE_ORDER[g.toUpperCase()] ?? -1;
}

function detectMovements(
  current: (ActiveEmployee & { site: Site })[],
  currentResign: ResignEmployee[],
  prev: PrevEmployeeSnapshot[],
  prevResign: PrevResignSnapshot[],
): EmployeeMovement[] {
  if (prev.length === 0) return [];

  const prevMap = new Map(prev.map((e) => [e.badge, e]));
  const prevResignSet = new Set(prevResign.map((r) => r.badge));
  const currentResignSet = new Set(currentResign.map((r) => r.badge));

  const movements: EmployeeMovement[] = [];

  for (const emp of current) {
    const p = prevMap.get(emp.badge);
    if (!p) continue; // new joiner, not a movement

    const curPos = levelToPositionRefined(emp.joblevel, emp.jobgrade, emp.jobtitle, emp.citizenship);
    const prevPos = levelToPositionRefined(p.joblevel, p.jobgrade, p.jobtitle, p.citizenship);
    const siteChanged = emp.site !== p.site;
    const levelChanged = emp.joblevel.toLowerCase() !== p.joblevel.toLowerCase();
    const gradeChanged = emp.jobgrade.toUpperCase() !== p.jobgrade.toUpperCase();

    if (siteChanged) {
      movements.push({
        type: "site-transfer",
        badge: emp.badge,
        name: emp.name,
        site: emp.site,
        position: curPos,
        fromSite: p.site as Site,
        fromPosition: prevPos !== curPos ? prevPos : undefined,
      });
    } else if (levelChanged) {
      movements.push({
        type: "category-change",
        badge: emp.badge,
        name: emp.name,
        site: emp.site,
        position: curPos,
        fromPosition: prevPos,
        joblevel: emp.joblevel,
        fromJoblevel: p.joblevel,
      });
    } else if (gradeChanged && gradeRank(emp.jobgrade) > gradeRank(p.jobgrade)) {
      // Grade went up — promotion
      movements.push({
        type: "promotion",
        badge: emp.badge,
        name: emp.name,
        site: emp.site,
        position: curPos,
        fromPosition: prevPos !== curPos ? prevPos : undefined,
        jobgrade: emp.jobgrade,
        fromJobgrade: p.jobgrade,
      });
    } else if (emp.section !== p.section && emp.section && p.section) {
      // Section transfer — same site, same grade, section changed (any level)
      movements.push({
        type: "section-transfer",
        badge: emp.badge,
        name: emp.name,
        site: emp.site,
        position: curPos,
        section: emp.section,
        fromSection: p.section,
      });
    }
  }

  // Resignation pullbacks: was in prev resign list, NOT in current resign list, still active
  const currentBadges = new Set(current.map((e) => e.badge));
  for (const r of prevResign) {
    if (!currentResignSet.has(r.badge) && currentBadges.has(r.badge)) {
      const emp = current.find((e) => e.badge === r.badge);
      if (emp) {
        const pos = levelToPositionRefined(emp.joblevel, emp.jobgrade, emp.jobtitle, emp.citizenship);
        movements.push({
          type: "resignation-pullback",
          badge: emp.badge,
          name: emp.name,
          site: emp.site,
          position: pos,
        });
      }
    }
  }

  return movements;
}

function parseFlexDate(d: string): Date | null {
  if (!d) return null;
  const parts = String(d).split(/[-/]/);
  if (parts.length === 3) {
    if (isNaN(Number(parts[1]))) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const day = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase().slice(0, 3)] ?? 0;
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year)) return new Date(year, month, day);
    }
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }
  const ts = Date.parse(d);
  return isNaN(ts) ? null : new Date(ts);
}
