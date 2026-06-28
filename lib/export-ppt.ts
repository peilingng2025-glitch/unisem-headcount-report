"use client";
import type { HeadcountReport, SiteReport } from "./types";

// Colours matching Unisem corporate feel
const CLR = {
  headerBg: "1F3864",   // dark navy
  headerTxt: "FFFFFF",
  rowAlt: "F2F7FF",
  totalBg: "D6E4F7",
  blue: "2E75B6",
  red: "C00000",
  green: "375623",
  accent: "BDD7EE",
  payrollBg: "1F3864",
  payrollTxt: "FFFFFF",
};

function addSiteSlide(pptx: InstanceType<typeof import("pptxgenjs")["default"]>, siteLabel: string, sr: SiteReport, report: HeadcountReport) {
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: "F8FAFC" };

  // Title bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.55, fill: { color: CLR.headerBg } });
  slide.addText(`${siteLabel} Headcount Overview ${report.weekLabel}`, {
    x: 0.3, y: 0, w: 8, h: 0.55,
    fontSize: 16, bold: true, color: CLR.headerTxt, valign: "middle",
  });
  slide.addText(`As at ${report.reportDate}`, {
    x: 7.5, y: 0, w: 2.3, h: 0.55,
    fontSize: 9, color: "AACCEE", align: "right", valign: "middle",
  });

  // Payroll summary box (top right)
  const payrollX = 7.2;
  slide.addShape(pptx.ShapeType.rect, { x: payrollX, y: 0.65, w: 2.6, h: 0.9, fill: { color: CLR.payrollBg }, line: { color: CLR.payrollBg } });
  slide.addText("Payroll Headcount", { x: payrollX, y: 0.65, w: 2.6, h: 0.3, fontSize: 7, color: "AACCEE", align: "center", valign: "middle" });
  slide.addText(String(sr.payrollTotal), { x: payrollX, y: 0.9, w: 2.6, h: 0.65, fontSize: 28, bold: true, color: CLR.headerTxt, align: "center", valign: "middle" });

  // Small status pills
  const pills = [
    { label: "+ C Status (Left already)", val: sr.cStatus, color: "888888" },
    { label: "+ B Status (Serving Notice)", val: sr.bStatusCurrent + sr.bStatusFollowing, color: "E67E22" },
    { label: "Active", val: sr.activeTotal, color: CLR.blue },
  ];
  let pilY = 1.6;
  for (const p of pills) {
    slide.addText(`${p.label}`, { x: 7.2, y: pilY, w: 1.9, h: 0.22, fontSize: 7, color: p.color });
    slide.addText(String(p.val), { x: 9.1, y: pilY, w: 0.7, h: 0.22, fontSize: 9, bold: true, color: p.color, align: "right" });
    pilY += 0.25;
  }

  // Main table
  const tblData = [
    [
      { text: "Position", options: { bold: true, color: CLR.headerTxt, fill: CLR.headerBg, align: "left" } },
      { text: `Total\n${report.prevDate} (${report.prevWeekLabel})`, options: { bold: true, color: CLR.headerTxt, fill: CLR.headerBg, align: "center" } },
      { text: "Add", options: { bold: true, color: CLR.headerTxt, fill: CLR.headerBg, align: "center" } },
      { text: "Resigned /\nEnd Contract", options: { bold: true, color: CLR.headerTxt, fill: CLR.headerBg, align: "center" } },
      { text: "Transfer/Cert/\nPromo/Others", options: { bold: true, color: CLR.headerTxt, fill: CLR.headerBg, align: "center" } },
      { text: `Total\n${report.reportDate} (${report.weekLabel})`, options: { bold: true, color: CLR.headerTxt, fill: CLR.blue, align: "center" } },
    ],
    ...sr.positions.map((p, i) => [
      { text: p.position, options: { align: "left", fill: i % 2 === 0 ? "FFFFFF" : CLR.rowAlt } },
      { text: p.prevTotal || "—", options: { align: "center", fill: i % 2 === 0 ? "FFFFFF" : CLR.rowAlt } },
      { text: p.add > 0 ? String(p.add) : "—", options: { align: "center", color: p.add > 0 ? CLR.green : "CCCCCC", fill: i % 2 === 0 ? "FFFFFF" : CLR.rowAlt } },
      { text: p.resigned > 0 ? String(p.resigned) : "—", options: { align: "center", color: p.resigned > 0 ? CLR.red : "CCCCCC", fill: i % 2 === 0 ? "FFFFFF" : CLR.rowAlt } },
      { text: "—", options: { align: "center", color: "CCCCCC", fill: i % 2 === 0 ? "FFFFFF" : CLR.rowAlt } },
      { text: String(p.currentTotal), options: { align: "center", bold: true, fill: CLR.accent } },
    ]),
    [
      { text: "TOTAL", options: { bold: true, fill: CLR.totalBg, align: "left" } },
      { text: String(sr.positions.reduce((s, p) => s + p.prevTotal, 0)), options: { bold: true, fill: CLR.totalBg, align: "center" } },
      { text: String(sr.positions.reduce((s, p) => s + p.add, 0)), options: { bold: true, fill: CLR.totalBg, color: CLR.green, align: "center" } },
      { text: String(sr.positions.reduce((s, p) => s + p.resigned, 0)), options: { bold: true, fill: CLR.totalBg, color: CLR.red, align: "center" } },
      { text: "—", options: { bold: true, fill: CLR.totalBg, color: "CCCCCC", align: "center" } },
      { text: String(sr.activeTotal), options: { bold: true, fill: CLR.blue, color: "FFFFFF", align: "center" } },
    ],
  ];

  slide.addTable(tblData as Parameters<typeof slide.addTable>[0], {
    x: 0.3, y: 0.65, w: 6.7, h: 4.5,
    fontSize: 8.5,
    border: { pt: 0.5, color: "D0D8E8" },
    colW: [2, 1.1, 0.7, 1.1, 1.1, 1.15],
    rowH: Array(tblData.length).fill(0.32),
  });

  // Page number
  // slide number omitted — pptxgenjs handles page numbers via slide masters
}

export async function exportToPPT(report: HeadcountReport) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 — but we use 10x5.63

  pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.63 });
  pptx.layout = "WIDESCREEN";

  // Slide 1 — Title
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: CLR.headerBg };
  titleSlide.addText("MANAGEMENT", { x: 0, y: 1.5, w: "100%", h: 0.7, fontSize: 32, bold: true, color: "FFFFFF", align: "center" });
  titleSlide.addText("STAFF MEETING", { x: 0, y: 2.2, w: "100%", h: 0.7, fontSize: 32, bold: true, color: CLR.accent, align: "center" });
  titleSlide.addText(report.weekLabel + " — " + report.reportDate, { x: 0, y: 3.0, w: "100%", h: 0.4, fontSize: 14, color: "AACCEE", align: "center" });

  // Slide 2 — UM Overall
  addSiteSlide(pptx, "UM", report.overall, report);

  // Slides 3–5 — per site
  for (const sr of report.sites.filter((s) => s.activeTotal > 0)) {
    addSiteSlide(pptx, sr.site, sr, report);
  }

  const fileName = `WW${report.weekLabel}-Mgmt Mtg (${report.reportDate})_HR Headcount.pptx`;
  await pptx.writeFile({ fileName });
}
