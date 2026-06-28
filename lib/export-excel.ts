"use client";
import * as XLSX from "xlsx";
import type { HeadcountReport, SiteReport } from "./types";

function buildSiteSheet(ws: XLSX.WorkSheet, sr: SiteReport, siteLabel: string, report: HeadcountReport, rowOffset: number): number {
  const { prevWeekLabel, weekLabel: currentWeekLabel, prevDate, reportDate } = report;

  const addRow = (row: (string | number | null)[], isBold = false) => {
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: rowOffset, c: 0 } });
    rowOffset++;
  };

  addRow([`${siteLabel} Headcount Report as at ${reportDate} (${currentWeekLabel})`]);
  addRow([]);
  addRow(["Position", `Total\n${prevDate} (${prevWeekLabel})`, "Add", "Resigned /\nEnd Contract", "Transfer/Cert/\nPromotion/Others", `Total\n${reportDate} (${currentWeekLabel})`]);

  for (const pc of sr.positions) {
    addRow([pc.position, pc.prevTotal, pc.add, pc.resigned, pc.transfer, pc.currentTotal]);
  }

  const totals = sr.positions.reduce((s, p) => ({
    prev: s.prev + p.prevTotal, add: s.add + p.add, resigned: s.resigned + p.resigned, current: s.current + p.currentTotal
  }), { prev: 0, add: 0, resigned: 0, current: 0 });
  addRow(["", totals.prev, totals.add, totals.resigned, 0, sr.activeTotal]);

  addRow([]);
  addRow(["** B status (following months)", "", "", "", "", sr.bStatusFollowing]);
  addRow(["", "", "", "", "", sr.activeTotal + sr.bStatusFollowing]);
  addRow(["** B status (current month)", "", "", "", "", sr.bStatusCurrent]);
  addRow(["", "", "", "", "", sr.activeTotal + sr.bStatusFollowing + sr.bStatusCurrent]);
  addRow(["***C status", "", "", "", "", sr.cStatus]);
  addRow(["Total Payroll h/c", "", "", "", "", sr.payrollTotal]);
  addRow([]);

  return rowOffset;
}

export function exportToExcel(report: HeadcountReport) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryWs = XLSX.utils.aoa_to_sheet([]);
  let row = 0;

  const allSites = [
    { label: "Overall UM", data: report.overall },
    { label: "Corporate", data: report.sites[0] },
    { label: "UGP", data: report.sites[1] },
    { label: "USP", data: report.sites[2] },
    { label: "UAT", data: report.sites[3] },
  ];

  XLSX.utils.sheet_add_aoa(summaryWs, [[`UM Headcount Report as at ${report.reportDate} (${report.weekLabel})`]], { origin: { r: row, c: 0 } }); row += 2;

  for (const { label, data } of allSites) {
    XLSX.utils.sheet_add_aoa(summaryWs, [[`${label} Headcount`]], { origin: { r: row, c: 0 } }); row++;
    XLSX.utils.sheet_add_aoa(summaryWs, [["Position", `Total ${report.prevDate} (${report.prevWeekLabel})`, "Add", "Resigned / End Contract", "Transfer/Cert/Promotion/Others", `Total ${report.reportDate} (${report.weekLabel})`]], { origin: { r: row, c: 0 } }); row++;

    for (const pc of data.positions) {
      XLSX.utils.sheet_add_aoa(summaryWs, [[pc.position, pc.prevTotal, pc.add, pc.resigned, pc.transfer, pc.currentTotal]], { origin: { r: row, c: 0 } });
      row++;
    }
    XLSX.utils.sheet_add_aoa(summaryWs, [["", "", "", "", "", data.activeTotal]], { origin: { r: row, c: 0 } }); row++;
    XLSX.utils.sheet_add_aoa(summaryWs, [["** B status (following months)", "", "", "", "", data.bStatusFollowing]], { origin: { r: row, c: 0 } }); row++;
    XLSX.utils.sheet_add_aoa(summaryWs, [["** B status (current month)", "", "", "", "", data.bStatusCurrent]], { origin: { r: row, c: 0 } }); row++;
    XLSX.utils.sheet_add_aoa(summaryWs, [["***C status", "", "", "", "", data.cStatus]], { origin: { r: row, c: 0 } }); row++;
    XLSX.utils.sheet_add_aoa(summaryWs, [["Total Payroll h/c", "", "", "", "", data.payrollTotal]], { origin: { r: row, c: 0 } }); row++;
    row++;
  }

  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // Leavers sheet
  const leaverRows = [
    ["Badge", "Name", "Section", "Job Title", "Level", "Site", "Last Day", "Payroll Month", "Reason"],
    ...report.leavers.map((l) => [l.badge, l.name, l.section, l.jobtitle, l.jobLevel, l.site, l.resignDate, l.payrollMonth, l.reason]),
  ];
  const leaversWs = XLSX.utils.aoa_to_sheet(leaverRows);
  XLSX.utils.book_append_sheet(wb, leaversWs, "Resignation Listing");

  const fileName = `HC Report ${new Date().getFullYear()}${report.weekLabel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
