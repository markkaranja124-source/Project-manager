/**
 * REPORT GENERATOR SERVICE
 * Generates professional multi-page PDF attendance registers for Weekly & Monthly periods
 * Engine: PDFKit
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Format Date YYYY-MM-DD
function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Pretty Month Names
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculate dates for a specific week (Monday to Sunday)
 */
function getWeekRange(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  // Determine previous Monday
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

/**
 * Calculate dates for a month (1st to last day, dynamic length)
 */
function getMonthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate(); // Accurate for 28/29/30/31 days
  const end = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999);
  return { start, end, daysInMonth };
}

/**
 * Fetch business name from settings table
 */
async function getBusinessSettings(dbPool) {
  try {
    const [rows] = await dbPool.execute('SELECT setting_key, setting_value FROM settings');
    const settings = {
      businessName: 'EXECUTIVE RESTAURANT & BAR',
      branch: 'Main Service Operations'
    };
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    return settings;
  } catch (e) {
    return {
      businessName: 'EXECUTIVE RESTAURANT & BAR',
      branch: 'Main Service Operations'
    };
  }
}

/**
 * Core PDF Generation Engine
 */
async function buildAttendancePdf({
  reportType,
  periodStart,
  periodEnd,
  periodLabel,
  businessName,
  branch,
  dbPool
}) {
  // 1. Fetch Staff
  const [staffRows] = await dbPool.execute(
    'SELECT id, code, name, station, shift FROM staff ORDER BY code ASC'
  );

  // 2. Fetch Attendance in Date Range
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  const [attRows] = await dbPool.execute(
    `SELECT DATE_FORMAT(date, "%Y-%m-%d") as date_str, staff_id, status, note 
     FROM attendance 
     WHERE date >= ? AND date <= ? 
     ORDER BY date ASC`,
    [startStr, endStr]
  );

  // Index attendance: staff_id -> array of records
  const attByStaff = {};
  staffRows.forEach(s => { attByStaff[s.id] = []; });
  attRows.forEach(r => {
    if (!attByStaff[r.staff_id]) attByStaff[r.staff_id] = [];
    attByStaff[r.staff_id].push(r);
  });

  // Calculate statistics for each staff
  let grandPresent = 0;
  let grandAbsent = 0;
  let grandLate = 0;
  let grandOff = 0;

  const staffStats = staffRows.map(staff => {
    const records = attByStaff[staff.id] || [];
    let p = 0, a = 0, l = 0, o = 0;
    const absentDates = [];

    records.forEach(r => {
      const st = (r.status || '').toUpperCase();
      if (st === 'P') p++;
      else if (st === 'A') {
        a++;
        absentDates.push(r.date_str.slice(5)); // e.g. "09-18"
      } else if (st === 'L') l++;
      else if (st === 'O') o++;
    });

    grandPresent += p;
    grandAbsent += a;
    grandLate += l;
    grandOff += o;

    const totalMarked = p + a + l;
    const turnoutRate = totalMarked > 0 ? Math.round((p / totalMarked) * 100) : (records.length > 0 ? 0 : 100);

    return {
      code: staff.code,
      name: staff.name,
      station: staff.station || '-',
      shift: staff.shift || 'Morning',
      present: p,
      absent: a,
      late: l,
      off: o,
      absentDates: absentDates.join(', ') || 'None',
      turnoutRate
    };
  });

  const totalShiftsMarked = grandPresent + grandAbsent + grandLate;
  const overallTurnoutRate = totalShiftsMarked > 0 
    ? Math.round((grandPresent / totalShiftsMarked) * 100) 
    : 100;

  // 3. Create PDF Document with PDFKit
  const reportId = `rep_${reportType.toLowerCase()}_${Date.now()}`;
  const filename = `${reportType}_Attendance_${startStr}_to_${endStr}_${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margins: { top: 40, bottom: 40, left: 36, right: 36 },
    bufferPages: true,
    info: {
      Title: `${reportType} Staff Attendance Register`,
      Author: businessName,
      Subject: `Attendance Register: ${periodLabel}`,
      CreationDate: new Date()
    }
  });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Colors
  const cNavyDark = '#061527';
  const cNavyPrimary = '#0A2540';
  const cNavyLight = '#1E3A8A';
  const cGrayBorder = '#CBD5E1';
  const cGrayBg = '#F8FAFC';
  const cRedText = '#991B1B';

  function drawHeader() {
    // Top Bar
    doc.rect(36, 40, doc.page.width - 72, 54).fill(cNavyDark);

    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(businessName.toUpperCase(), 48, 48, { characterSpacing: 1 });

    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#94A3B8')
      .text(`BRANCH: ${branch.toUpperCase()}  •  OFFICIAL ATTENDANCE REGISTER`, 48, 68);

    // Meta Badge
    doc.fillColor(cNavyPrimary)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`${reportType.toUpperCase()} ATTENDANCE REPORT`, 36, 106);

    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(`REPORTING PERIOD: ${periodLabel.toUpperCase()}  |  GENERATED: ${new Date().toLocaleString()}`, 36, 122);

    doc.moveTo(36, 136).lineTo(doc.page.width - 36, 136).strokeColor(cNavyPrimary).lineWidth(1.5).stroke();
  }

  drawHeader();

  // Summary Metrics Bar
  let curY = 146;
  const colW = (doc.page.width - 72) / 4;

  const metrics = [
    { label: 'TOTAL STAFF', val: String(staffRows.length) },
    { label: 'ATTENDANCE RATE', val: `${overallTurnoutRate}%` },
    { label: 'TOTAL PRESENT', val: String(grandPresent) },
    { label: 'TOTAL ABSENCES', val: String(grandAbsent) }
  ];

  metrics.forEach((m, idx) => {
    const x = 36 + (idx * colW);
    doc.rect(x, curY, colW - 4, 38).fillAndStroke(cGrayBg, cGrayBorder);
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text(m.label, x + 8, curY + 6);
    doc.fillColor(m.label === 'TOTAL ABSENCES' && grandAbsent > 0 ? cRedText : cNavyPrimary)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(m.val, x + 8, curY + 18);
  });

  curY += 48;

  // Table Headers
  const tableHeaders = [
    { label: 'ID', width: 44, align: 'left' },
    { label: 'STAFF NAME', width: 120, align: 'left' },
    { label: 'SHIFT', width: 56, align: 'left' },
    { label: 'P', width: 26, align: 'center' },
    { label: 'A', width: 26, align: 'center' },
    { label: 'L', width: 26, align: 'center' },
    { label: 'O', width: 26, align: 'center' },
    { label: 'RATE', width: 40, align: 'center' },
    { label: 'ABSENT DATES', width: 158, align: 'left' }
  ];

  function drawTableHeader(y) {
    let tx = 36;
    doc.rect(36, y, doc.page.width - 72, 18).fill(cNavyPrimary);
    tableHeaders.forEach(th => {
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(th.label, tx + 4, y + 5, { width: th.width - 8, align: th.align });
      tx += th.width;
    });
  }

  drawTableHeader(curY);
  curY += 18;

  // Table Rows
  staffStats.forEach((s, rIndex) => {
    // Page Break Check
    if (curY > doc.page.height - 100) {
      doc.addPage();
      drawHeader();
      curY = 150;
      drawTableHeader(curY);
      curY += 18;
    }

    const rowBg = rIndex % 2 === 0 ? '#FFFFFF' : cGrayBg;
    doc.rect(36, curY, doc.page.width - 72, 18).fillAndStroke(rowBg, cGrayBorder);

    let tx = 36;
    const rowCells = [
      { text: s.code, width: 44, align: 'left', bold: true },
      { text: s.name, width: 120, align: 'left', bold: true },
      { text: s.shift, width: 56, align: 'left', bold: false },
      { text: String(s.present), width: 26, align: 'center', bold: true, color: cNavyPrimary },
      { text: String(s.absent), width: 26, align: 'center', bold: true, color: s.absent > 0 ? cRedText : '#000' },
      { text: String(s.late), width: 26, align: 'center', bold: false },
      { text: String(s.off), width: 26, align: 'center', bold: false },
      { text: `${s.turnoutRate}%`, width: 40, align: 'center', bold: true },
      { text: s.absentDates, width: 158, align: 'left', bold: false, color: s.absent > 0 ? cRedText : '#64748B' }
    ];

    rowCells.forEach(cell => {
      doc.fillColor(cell.color || '#0F172A')
        .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(7.5)
        .text(cell.text, tx + 4, curY + 5, { width: cell.width - 8, align: cell.align, ellipsis: true });
      tx += cell.width;
    });

    curY += 18;
  });

  // Sign-Off Block
  if (curY > doc.page.height - 110) {
    doc.addPage();
    curY = 60;
  } else {
    curY += 24;
  }

  doc.rect(36, curY, doc.page.width - 72, 60).fillAndStroke('#FFFFFF', cGrayBorder);
  
  const halfW = (doc.page.width - 72) / 2;
  // Box 1: Manager
  doc.fillColor(cNavyPrimary).font('Helvetica-Bold').fontSize(8)
    .text('PREPARED BY: DUTY MANAGER / SUPERVISOR', 48, curY + 8);
  doc.moveTo(48, curY + 42).lineTo(48 + halfW - 30, curY + 42).strokeColor('#94A3B8').lineWidth(1).stroke();
  doc.fillColor('#64748B').font('Helvetica').fontSize(7)
    .text('Signature & Date', 48, curY + 46);

  // Box 2: Operations Audit
  doc.fillColor(cNavyPrimary).font('Helvetica-Bold').fontSize(8)
    .text('VERIFIED BY: GENERAL MANAGER / AUDITOR', 48 + halfW, curY + 8);
  doc.moveTo(48 + halfW, curY + 42).lineTo(48 + halfW + halfW - 30, curY + 42).strokeColor('#94A3B8').lineWidth(1).stroke();
  doc.fillColor('#64748B').font('Helvetica').fontSize(7)
    .text('Signature & Date', 48 + halfW, curY + 46);

  // Page Numbers Footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(8)
      .text(
        `CONFIDENTIAL — ${businessName.toUpperCase()} — PAGE ${i + 1} OF ${range.count}`,
        36,
        doc.page.height - 28,
        { align: 'center', width: doc.page.width - 72 }
      );
  }

  doc.end();

  // Wait for file write completion
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const fileStats = fs.statSync(filePath);

  // 4. Save Record in generated_reports table
  await dbPool.execute(
    `INSERT INTO generated_reports 
     (id, report_type, period_start, period_end, filename, file_path, file_size, total_staff, turnout_rate, delivery_status, whatsapp_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'GENERATED', 'DISABLED')`,
    [
      reportId,
      reportType,
      startStr,
      endStr,
      filename,
      filePath,
      fileStats.size,
      staffRows.length,
      overallTurnoutRate
    ]
  );

  return {
    reportId,
    filename,
    filePath,
    fileSize: fileStats.size,
    periodStart: startStr,
    periodEnd: endStr,
    periodLabel,
    totalStaff: staffRows.length,
    turnoutRate: overallTurnoutRate
  };
}

/**
 * Public API: Generate Weekly Report (Monday to Sunday)
 */
async function generateWeeklyReport(dbPool, referenceDate = new Date()) {
  const { monday, sunday } = getWeekRange(referenceDate);
  const settings = await getBusinessSettings(dbPool);

  const periodLabel = `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;

  return buildAttendancePdf({
    reportType: 'WEEKLY',
    periodStart: monday,
    periodEnd: sunday,
    periodLabel,
    businessName: settings.businessName,
    branch: settings.branch,
    dbPool
  });
}

/**
 * Public API: Generate Monthly Report (1st to last day, dynamic length)
 */
async function generateMonthlyReport(dbPool, year = new Date().getFullYear(), monthIndex = new Date().getMonth() - 1) {
  // If monthIndex is -1 (January requested for previous month), wrap to December previous year
  if (monthIndex < 0) {
    monthIndex = 11;
    year -= 1;
  }

  const { start, end } = getMonthRange(year, monthIndex);
  const settings = await getBusinessSettings(dbPool);
  const periodLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

  return buildAttendancePdf({
    reportType: 'MONTHLY',
    periodStart: start,
    periodEnd: end,
    periodLabel,
    businessName: settings.businessName,
    branch: settings.branch,
    dbPool
  });
}

module.exports = {
  generateWeeklyReport,
  generateMonthlyReport,
  getWeekRange,
  getMonthRange,
  REPORTS_DIR
};
