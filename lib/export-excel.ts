"use client";
import * as XLSX from "xlsx";
import type { HeadcountReport, SiteReport, Position } from "./types";

// ── Corporate uses 5 positions; map our 10 onto them ─────────────────────────
type CorpMapEntry = { ourPositions: Position[] };
const CORP_5: CorpMapEntry[] = [
  { ourPositions: ["Management"] },
  { ourPositions: ["Specialist Eng", "Section Head", "Engineer"] },
  { ourPositions: ["Other Exec"] },
  { ourPositions: ["Supervisor", "Technician"] },
  { ourPositions: ["Other Non-Exec", "Operator (Local)", "Operator (Foreign)"] },
];

const POS10: Position[] = [
  "Management", "Specialist Eng", "Section Head", "Engineer", "Other Exec",
  "Supervisor", "Technician", "Other Non-Exec", "Operator (Local)", "Operator (Foreign)",
];

function aggPos(sr: SiteReport, positions: Position[]) {
  const pcs = sr.positions.filter(p => positions.includes(p.position as Position));
  return {
    prevTotal: pcs.reduce((s, p) => s + p.prevTotal, 0),
    add:       pcs.reduce((s, p) => s + p.add, 0),
    resigned:  pcs.reduce((s, p) => s + p.resigned, 0),
    transfer:  pcs.reduce((s, p) => s + p.transfer, 0),
    currentTotal: pcs.reduce((s, p) => s + p.currentTotal, 0),
  };
}

function posOf(sr: SiteReport, pos: Position) {
  return sr.positions.find(p => p.position === pos)!;
}

// Set a cell value while preserving its existing style index.
// Also removes any formula so the cell becomes a plain value.
function sc(ws: XLSX.WorkSheet, addr: string, value: string | number) {
  const existing = ws[addr];
  const s = existing?.s;
  const t = typeof value === "number" ? "n" : "s";
  ws[addr] = { t, v: value, ...(s !== undefined ? { s } : {}) };
}

// ── Template-based export ─────────────────────────────────────────────────────

async function exportWithTemplate(report: HeadcountReport) {
  const resp = await fetch("/hc-template.xlsx");
  if (!resp.ok) throw new Error("template not found");
  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellStyles: true });

  updateSummarySheet(wb.Sheets["Summary"], report);
  updateUatSheet(wb.Sheets["UAT Headcount"], report);
  addResignSheet(wb, report);

  const outBuf = XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true }) as ArrayBuffer;
  downloadBuffer(outBuf, report);
}

function updateSummarySheet(ws: XLSX.WorkSheet, report: HeadcountReport) {
  const corp = report.sites.find(s => s.site === "Corporate")!;
  const ugp  = report.sites.find(s => s.site === "UGP")!;
  const usp  = report.sites.find(s => s.site === "USP")!;

  const prevHdr = `Total\n${report.prevDate} (${report.prevWeekLabel})`;
  const currHdr = `Total\n${report.reportDate} (${report.weekLabel})`;

  // Title
  sc(ws, "B2", `UM Headcount Report as at ${report.reportDate} (${report.weekLabel})`);

  // ── Overall section (rows 6-15) ──────────────────────────────────────────
  sc(ws, "C5", prevHdr);
  sc(ws, "G5", currHdr);
  POS10.forEach((pos, i) => {
    const r = 6 + i;
    const pc = posOf(report.overall, pos);
    sc(ws, `C${r}`, pc.prevTotal);
    sc(ws, `D${r}`, pc.add);
    sc(ws, `E${r}`, pc.resigned);
    sc(ws, `F${r}`, pc.transfer);
    sc(ws, `G${r}`, pc.currentTotal);
  });
  // G16 TOTAL: keep =SUM(G6:G15) formula — untouched
  // G17/G19/G21: formulas =G32+G52+G72 etc. — untouched; recalc from below

  // ── Corporate section (rows 26-30) ───────────────────────────────────────
  sc(ws, "C25", prevHdr);
  sc(ws, "G25", currHdr);
  CORP_5.forEach(({ ourPositions }, i) => {
    const r = 26 + i;
    const agg = aggPos(corp, ourPositions);
    sc(ws, `C${r}`, agg.prevTotal);
    sc(ws, `D${r}`, agg.add);
    sc(ws, `E${r}`, agg.resigned);
    sc(ws, `F${r}`, agg.transfer);
    sc(ws, `G${r}`, agg.currentTotal);
  });
  // G31 TOTAL: keep =SUM(G26:G30) — untouched
  sc(ws, "G32", corp.bStatusFollowing);
  sc(ws, "G34", corp.bStatusCurrent);
  sc(ws, "G36", corp.cStatus);

  // ── UGP section (rows 41-50) ─────────────────────────────────────────────
  sc(ws, "C40", prevHdr);
  sc(ws, "G40", currHdr);
  POS10.forEach((pos, i) => {
    const r = 41 + i;
    const pc = posOf(ugp, pos);
    sc(ws, `C${r}`, pc.prevTotal);
    sc(ws, `D${r}`, pc.add);
    sc(ws, `E${r}`, pc.resigned);
    sc(ws, `F${r}`, pc.transfer);
    sc(ws, `G${r}`, pc.currentTotal);
  });
  // G51 TOTAL: keep =SUM(G41:G50) — untouched
  sc(ws, "G52", ugp.bStatusFollowing);
  sc(ws, "G54", ugp.bStatusCurrent);
  sc(ws, "G56", ugp.cStatus);

  // ── USP section (rows 61-70) ─────────────────────────────────────────────
  sc(ws, "C60", prevHdr);
  sc(ws, "G60", currHdr);
  POS10.forEach((pos, i) => {
    const r = 61 + i;
    const pc = posOf(usp, pos);
    sc(ws, `C${r}`, pc.prevTotal);
    sc(ws, `D${r}`, pc.add);
    sc(ws, `E${r}`, pc.resigned);
    sc(ws, `F${r}`, pc.transfer);
    sc(ws, `G${r}`, pc.currentTotal);
  });
  // G71 TOTAL: keep =SUM(G61:G70) — untouched
  sc(ws, "G72", usp.bStatusFollowing);
  sc(ws, "G74", usp.bStatusCurrent);
  sc(ws, "G76", usp.cStatus);
}

function updateUatSheet(ws: XLSX.WorkSheet, report: HeadcountReport) {
  const uat = report.sites.find(s => s.site === "UAT")!;
  const prevHdr = `UAT \n${report.prevDate}`;
  const currHdr = `UAT \n${report.reportDate}`;

  // Title
  sc(ws, "B2", `UAT Headcount Report as at ${report.reportDate} (${report.weekLabel})`);

  // Section date headers (C=prev, G=curr) in each section header row
  for (const row of [4, 12, 18, 28]) {
    sc(ws, `C${row}`, prevHdr);
    sc(ws, `G${row}`, currHdr);
  }

  // ── MANAGEMENT (rows 5-10) ────────────────────────────────────────────────
  // Put all management headcount in VP row (R5); zero out R6-R9
  const mgmt = posOf(uat, "Management");
  sc(ws, "C5", mgmt.prevTotal); sc(ws, "D5", mgmt.add); sc(ws, "E5", mgmt.resigned); sc(ws, "F5", mgmt.transfer);
  for (const r of [6, 7, 8, 9]) {
    sc(ws, `C${r}`, 0); sc(ws, `D${r}`, 0); sc(ws, `E${r}`, 0); sc(ws, `F${r}`, 0);
  }
  // C10 (section prevTotal) is hardcoded in template — update it
  sc(ws, "C10", mgmt.prevTotal);
  // D10/E10/F10 are =SUM(D5:D9) etc. — untouched; G10 is formula — untouched

  // ── EXECUTIVE (rows 13-15) ───────────────────────────────────────────────
  // R13: Section Head → Specialist Eng + Section Head
  // R14: Engineer
  // R15: Others Executive → Other Exec
  const specHead = aggPos(uat, ["Specialist Eng", "Section Head"]);
  const engr     = posOf(uat, "Engineer");
  const otherExec= posOf(uat, "Other Exec");
  const execRows: [typeof specHead, number][] = [[specHead, 13], [engr, 14], [otherExec, 15]];
  for (const [pc, r] of execRows) {
    sc(ws, `C${r}`, pc.prevTotal); sc(ws, `D${r}`, pc.add);
    sc(ws, `E${r}`, pc.resigned);  sc(ws, `F${r}`, pc.transfer);
  }
  sc(ws, "C16", specHead.prevTotal + engr.prevTotal + otherExec.prevTotal);

  // ── NON-EXECUTIVE (rows 19-25) ───────────────────────────────────────────
  // R19: Other Non-Exec, R20: Supervisor, R21: Technician (aggregated), R22-R25: 0
  const nonExecData: [Position | null, number][] = [
    ["Other Non-Exec", 19], ["Supervisor", 20], ["Technician", 21],
    [null, 22], [null, 23], [null, 24], [null, 25],
  ];
  let nonExecPrevTotal = 0;
  for (const [pos, r] of nonExecData) {
    if (pos) {
      const pc = posOf(uat, pos);
      sc(ws, `C${r}`, pc.prevTotal); sc(ws, `D${r}`, pc.add);
      sc(ws, `E${r}`, pc.resigned);  sc(ws, `F${r}`, pc.transfer);
      nonExecPrevTotal += pc.prevTotal;
    } else {
      sc(ws, `C${r}`, 0); sc(ws, `D${r}`, 0); sc(ws, `E${r}`, 0); sc(ws, `F${r}`, 0);
    }
  }
  sc(ws, "C26", nonExecPrevTotal);

  // ── OPERATOR (rows 29-32) ────────────────────────────────────────────────
  const opLocal   = posOf(uat, "Operator (Local)");
  const opForeign = posOf(uat, "Operator (Foreign)");
  sc(ws, "C29", opLocal.prevTotal);   sc(ws, "D29", opLocal.add);   sc(ws, "E29", opLocal.resigned);   sc(ws, "F29", opLocal.transfer);
  sc(ws, "C30", opForeign.prevTotal); sc(ws, "D30", opForeign.add); sc(ws, "E30", opForeign.resigned); sc(ws, "F30", opForeign.transfer);
  sc(ws, "C31", 0); sc(ws, "D31", 0); sc(ws, "E31", 0); sc(ws, "F31", 0);
  sc(ws, "C32", 0); sc(ws, "D32", 0); sc(ws, "E32", 0); sc(ws, "F32", 0);
  sc(ws, "C33", opLocal.prevTotal + opForeign.prevTotal);

  // ── B/C STATUS (rows 35-43) ──────────────────────────────────────────────
  // Row 35: week labels
  sc(ws, "C35", report.prevWeekLabel);
  sc(ws, "G35", report.weekLabel);
  // Row 36: prev active total (C col) and current formula (G col kept)
  const uatPrevActive = POS10.reduce((s, pos) => s + posOf(uat, pos).prevTotal, 0);
  sc(ws, "C36", uatPrevActive);
  // G36 = formula =SUM(G33+G26+G16+G10) — untouched; recalculates from section TOTALs
  // B-status breakdown (we only have total, not per-category — put all in NON EXEC row)
  sc(ws, "C37", 0); sc(ws, "G37", 0);  // OPERATOR
  sc(ws, "C38", 0); sc(ws, "G38", uat.bStatusFollowing);  // NON EXEC (put all here)
  sc(ws, "C39", 0); sc(ws, "G39", 0);  // EXEC
  sc(ws, "C40", 0); sc(ws, "G40", 0);  // MGMT
  // G41: formula =SUM(G36:G40) — untouched
  sc(ws, "G42", uat.cStatus);           // C STATUS
  // G43: formula =G41+G42 — untouched
}

function addResignSheet(wb: XLSX.WorkBook, report: HeadcountReport) {
  const rows: (string | number | null)[][] = [
    ["Badge", "Name", "Section", "Job Title", "Level", "Site", "Last Day", "Payroll Month", "Reason"],
    ...report.leavers.map(l => [l.badge, l.name, l.section, l.jobtitle, l.jobLevel, l.site, l.resignDate, l.payrollMonth, l.reason]),
  ];
  const resignWs = XLSX.utils.aoa_to_sheet(rows);
  // Remove old sheet if it exists, then append
  const existingIdx = wb.SheetNames.indexOf("Resignation Listing");
  if (existingIdx >= 0) {
    wb.SheetNames.splice(existingIdx, 1);
    delete wb.Sheets["Resignation Listing"];
  }
  XLSX.utils.book_append_sheet(wb, resignWs, "Resignation Listing");
}

function downloadBuffer(buf: ArrayBuffer, report: HeadcountReport) {
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HC Report ${new Date().getFullYear()}${report.weekLabel}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Fallback: plain export without template ───────────────────────────────────

function exportFallback(report: HeadcountReport) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number | null)[][] = [
    [`UM Headcount Report as at ${report.reportDate} (${report.weekLabel})`],
    [],
    ["Position", `Total ${report.prevDate}`, "Add", "Resigned", "Transfer", `Total ${report.reportDate}`],
  ];

  for (const { label, data } of [
    { label: "Overall UM", data: report.overall },
    { label: "Corporate", data: report.sites.find(s => s.site === "Corporate")! },
    { label: "UGP", data: report.sites.find(s => s.site === "UGP")! },
    { label: "USP", data: report.sites.find(s => s.site === "USP")! },
    { label: "UAT", data: report.sites.find(s => s.site === "UAT")! },
  ]) {
    rows.push([`── ${label} ──`]);
    for (const pc of data.positions) {
      rows.push([pc.position, pc.prevTotal, pc.add, pc.resigned, pc.transfer, pc.currentTotal]);
    }
    rows.push(["TOTAL", "", "", "", "", data.activeTotal]);
    rows.push(["** B-following", "", "", "", "", data.bStatusFollowing]);
    rows.push(["** B-current", "", "", "", "", data.bStatusCurrent]);
    rows.push(["*** C-status", "", "", "", "", data.cStatus]);
    rows.push(["Total Payroll", "", "", "", "", data.payrollTotal]);
    rows.push([]);
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Badge", "Name", "Section", "Job Title", "Level", "Site", "Last Day", "Payroll Month", "Reason"],
    ...report.leavers.map(l => [l.badge, l.name, l.section, l.jobtitle, l.jobLevel, l.site, l.resignDate, l.payrollMonth, l.reason]),
  ]), "Resignation Listing");

  XLSX.writeFile(wb, `HC Report ${new Date().getFullYear()}${report.weekLabel}.xlsx`);
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function exportToExcel(report: HeadcountReport) {
  try {
    await exportWithTemplate(report);
  } catch {
    exportFallback(report);
  }
}
