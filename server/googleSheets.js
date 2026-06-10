import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CREDENTIALS_PATH = path.resolve(__dirname, '..', process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json');

let sheets = null;

async function getSheets() {
  if (sheets) return sheets;
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  return sheets;
}

// ---- Sheet Names ----
const SHEET = {
  CUSTOMERS: 'Customers',
  VENDORS: 'Vendors',
  AGENTS: 'Agents',
  ENGAGEMENTS: 'Engagements',
  TIMESHEETS: 'Timesheets',
  INVOICES: 'Invoices',
  PAYMENTS: 'Payments',
  COMMISSION: 'Commission',
  SETTINGS: 'Settings'
};

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---- Low-level helpers ----
async function readSheet(sheetName) {
  const api = await getSheets();
  const res = await api.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:ZZ`,
  });
  return (res.data.values || []).filter(r => r[0]);
}

async function appendRow(sheetName, row) {
  const api = await getSheets();
  await api.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

async function updateRow(sheetName, rowIndex, row) {
  const api = await getSheets();
  await api.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

async function updateCell(sheetName, rowIndex, col, value) {
  const api = await getSheets();
  const colLetter = String.fromCharCode(64 + col);
  await api.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

async function deleteRow(sheetName, rowIndex) {
  const api = await getSheets();
  const sheetMeta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetObj = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheetObj) return;
  await api.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sheetObj.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
        }
      }]
    }
  });
}

async function findRowIndex(sheetName, id) {
  const rows = await readSheet(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return i + 2; // 1-based, skip header
  }
  return -1;
}

async function nextId(sheetName, prefix) {
  const rows = await readSheet(sheetName);
  let max = 0;
  for (const r of rows) {
    const m = String(r[0]).replace(/[^0-9]/g, '');
    if (m) { const n = parseInt(m, 10); if (n > max) max = n; }
  }
  return prefix + String(max + 1).padStart(4, '0');
}

async function invoiceId(year, month) {
  const base = 'invoice-' + MONTH_NAMES[month] + '-' + year;
  const rows = await readSheet(SHEET.INVOICES);
  let count = 0;
  for (const r of rows) {
    if (String(r[0]).startsWith(base)) count++;
  }
  return count === 0 ? base : base + '-' + (count + 1);
}

// ---- Helpers ----
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round2 = n => Math.round(num(n) * 100) / 100;
const isoNow = () => new Date().toISOString();
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

function parseDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + (parseInt(days, 10) || 0));
  return d.toISOString();
}

function fmtDateMMDDYYYY(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
    d.getDate().toString().padStart(2, '0') + '/' + d.getFullYear();
}

function weekOfMonth(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return Math.ceil(d.getDate() / 7);
}

function paymentFlag(dueIso, balance, today, soonDays) {
  if (num(balance) <= 0) return 'paid';
  if (!dueIso) return 'ok';
  const due = startOfDay(new Date(dueIso));
  if (isNaN(due.getTime())) return 'ok';
  if (due < today) return 'overdue';
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + soonDays);
  if (due <= startOfDay(soonDate)) return 'soon';
  return 'ok';
}

function computeStatus(custBal, custAmount, custPaid, custDue, today) {
  let status = 'Pending';
  if (custBal <= 0 && custAmount > 0) status = 'Paid';
  else if (custPaid > 0) status = 'Partial';
  if (status !== 'Paid' && custDue && startOfDay(new Date(custDue)) < today) status = 'Overdue';
  return status;
}

function computeCommission(eng, custAmount, billedHours) {
  if (!eng) return 0;
  const agentId = eng[5];
  const method = eng[12];
  const val = num(eng[13]);
  if (!agentId || !method || method === 'None') return 0;
  if (method === 'Percentage') return round2(num(custAmount) * val / 100);
  if (method === 'Fixed Monthly') return round2(val);
  if (method === 'Per Billed Hour') return round2(num(billedHours) * val);
  return 0;
}

// ---- Engagement lookup ----
async function getEngagement(engId) {
  const rows = await readSheet(SHEET.ENGAGEMENTS);
  return rows.find(r => String(r[0]) === String(engId)) || null;
}

// ---- Bootstrap (single load) ----
async function getBootstrapData() {
  const [customers, vendors, agents, engagements, timesheets, invoices, payments, commission, settings] =
    await Promise.all([
      readSheet(SHEET.CUSTOMERS),
      readSheet(SHEET.VENDORS),
      readSheet(SHEET.AGENTS),
      readSheet(SHEET.ENGAGEMENTS),
      readSheet(SHEET.TIMESHEETS),
      readSheet(SHEET.INVOICES),
      readSheet(SHEET.PAYMENTS),
      readSheet(SHEET.COMMISSION),
      readSheet(SHEET.SETTINGS).catch(() => [])
    ]);

  const soonDays = getSetting(settings, 'DUE_SOON_DAYS', 7);

  return {
    customers, vendors, agents, engagements, timesheets, invoices, payments, commission, settings,
    customerList: buildCustomerList(engagements, invoices, customers, soonDays),
    dashboard: buildDashboard(invoices, commission, soonDays),
    serverTime: new Date().toISOString()
  };
}

function getSetting(settings, key, fallback) {
  const row = settings.find(r => String(r[0]) === key);
  return row ? row[1] : fallback;
}

// ---- Dashboard ----
function buildDashboard(invoices, commission, soonDays) {
  const d = {
    totalReceivable: 0, totalPayable: 0, totalMargin: 0,
    overdueCustomer: 0, overdueVendor: 0,
    dueSoonCustomer: 0, dueSoonVendor: 0,
    pendingCommission: 0,
    statusCount: { Pending: 0, Partial: 0, Paid: 0, Overdue: 0 },
    recentInvoices: [], totalInvoices: 0
  };
  const today = startOfDay(new Date());
  for (const inv of invoices) {
    const custBal = num(inv[23]); const vendBal = num(inv[24]);
    const margin = num(inv[16]); const status = inv[29] || 'Pending';
    d.totalReceivable += custBal; d.totalPayable += vendBal; d.totalMargin += margin;
    const cf = paymentFlag(inv[19], custBal, today, soonDays);
    const vf = paymentFlag(inv[20], vendBal, today, soonDays);
    if (cf === 'overdue') d.overdueCustomer += custBal;
    if (cf === 'soon') d.dueSoonCustomer += custBal;
    if (vf === 'overdue') d.overdueVendor += vendBal;
    if (vf === 'soon') d.dueSoonVendor += vendBal;
    if (d.statusCount[status] !== undefined) d.statusCount[status]++;
    d.recentInvoices.push({ id: inv[0], date: inv[1], customer: inv[4], vendor: inv[6], year: inv[9], month: inv[10], amount: num(inv[13]), customerBalance: custBal, status, customerDueIso: inv[19] });
  }
  for (const c of commission) {
    if (c[8] === 'Pending') d.pendingCommission += num(c[7]);
  }
  d.recentInvoices.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  d.recentInvoices = d.recentInvoices.slice(0, 10);
  d.totalInvoices = invoices.length;
  ['totalReceivable', 'totalPayable', 'totalMargin', 'overdueCustomer', 'overdueVendor', 'dueSoonCustomer', 'dueSoonVendor', 'pendingCommission'].forEach(k => { d[k] = round2(d[k]); });
  return d;
}

// ---- Customer List ----
function buildCustomerList(engagements, invoices, customers, soonDays) {
  const today = startOfDay(new Date());
  const ownerById = {};
  for (const c of customers) ownerById[String(c[0])] = c[2] || '';

  return engagements.map(e => {
    const rows = invoices.filter(inv => String(inv[2]) === String(e[0]));
    let custOut = 0, vendOut = 0, billedHrs = 0, subHrs = 0;
    let custFlag = 'none', vendFlag = 'none';
    let latest = null;
    for (const inv of rows) {
      const cBal = num(inv[23]), vBal = num(inv[24]);
      custOut += cBal; vendOut += vBal;
      billedHrs += num(inv[11]); subHrs += num(inv[12]);
      const cf = paymentFlag(inv[19], cBal, today, soonDays);
      const vf = paymentFlag(inv[20], vBal, today, soonDays);
      if (['overdue', 'soon', 'ok'].indexOf(cf) > ['overdue', 'soon', 'ok'].indexOf(custFlag)) custFlag = cf;
      if (['overdue', 'soon', 'ok'].indexOf(vf) > ['overdue', 'soon', 'ok'].indexOf(vendFlag)) vendFlag = vf;
      const key = num(inv[9]) * 100 + num(inv[10]);
      if (!latest || key > latest.key) latest = { key, id: inv[0], y: inv[9], m: inv[10] };
    }
    return {
      engagementId: e[0], customerId: e[1], customerName: e[2], owner: ownerById[String(e[1])] || '',
      vendorId: e[3], vendorName: e[4], agentName: e[6] || '', scope: e[7] || '',
      customerRate: num(e[8]), vendorRate: num(e[9]),
      engagementStatus: e[14] || 'Active', monthsInvoiced: rows.length,
      latestInvoiceId: latest ? latest.id : '',
      totalBilledHours: round2(billedHrs), totalSubmittedHours: round2(subHrs),
      customerOutstanding: round2(custOut), vendorOutstanding: round2(vendOut),
      customerFlag: custFlag, vendorFlag: vendFlag
    };
  });
}

// ---- Timesheet helpers ----
function buildTimesheetRow(id, data, eng, created) {
  const custRate = num(eng[8]);
  const vendRate = num(eng[9]);
  const submitted = num(data.submittedHours);
  const billed = (data.billedHours === '' || data.billedHours == null) ? submitted : num(data.billedHours);
  const startDt = parseDate(data.startDate);
  const endDt = parseDate(data.endDate);
  const approval = data.approvalStatus || 'Pending';

  let weekNo = parseInt(data.weekNo, 10) || '';
  if (!weekNo && startDt) weekNo = weekOfMonth(startDt);

  let desc = data.description || '';
  if (!desc && startDt && endDt) {
    desc = 'Add Time Sheet For ' + fmtDateMMDDYYYY(startDt) + ' - ' + fmtDateMMDDYYYY(endDt) + ' (' + approval + ')';
  }

  return [
    id, data.engagementId, eng[1], eng[3],
    parseInt(data.year, 10) || new Date().getFullYear(),
    parseInt(data.month, 10) || (new Date().getMonth() + 1),
    weekNo, startDt, endDt, desc, approval,
    submitted, billed, custRate, vendRate,
    round2(billed * custRate), round2(submitted * vendRate),
    data.invoiceId || '', data.notes || '', created
  ];
}

// ---- Invoice helpers ----
async function collectMonthTimesheets(engId, year, month) {
  const rows = await readSheet(SHEET.TIMESHEETS);
  const out = { rows: [], indices: [], billed: 0, submitted: 0, custAmount: 0, vendCost: 0 };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[1]) === String(engId) && parseInt(r[4], 10) === parseInt(year, 10) && parseInt(r[5], 10) === parseInt(month, 10)) {
      out.rows.push(r);
      out.indices.push(i + 2);
      out.billed += num(r[12]); out.submitted += num(r[11]);
      out.custAmount += num(r[15]); out.vendCost += num(r[16]);
    }
  }
  out.billed = round2(out.billed); out.submitted = round2(out.submitted);
  out.custAmount = round2(out.custAmount); out.vendCost = round2(out.vendCost);
  return out;
}

async function sumPayments(invoiceId) {
  const rows = await readSheet(SHEET.PAYMENTS);
  let custPaid = 0, vendPaid = 0;
  for (const r of rows) {
    if (String(r[1]) !== String(invoiceId)) continue;
    if (r[2] === 'Customer Received') custPaid += num(r[3]);
    else if (r[2] === 'Vendor Paid') vendPaid += num(r[3]);
  }
  return { custPaid: round2(custPaid), vendPaid: round2(vendPaid) };
}

async function regenerateInvoice(invoiceIdVal) {
  const invRow = await findRowIndex(SHEET.INVOICES, invoiceIdVal);
  if (invRow < 0) return;
  const api = await getSheets();
  const res = await api.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${SHEET.INVOICES}!A${invRow}:AF${invRow}` });
  const inv = res.data.values[0];
  const engId = inv[2], year = inv[9], month = inv[10];
  const eng = await getEngagement(engId);
  const ms = await collectMonthTimesheets(engId, year, month);

  // Re-stamp timesheets
  const allTs = await readSheet(SHEET.TIMESHEETS);
  for (let i = 0; i < allTs.length; i++) {
    const rn = i + 2;
    if (ms.indices.includes(rn)) {
      await updateCell(SHEET.TIMESHEETS, rn, 18, invoiceIdVal);
    } else if (String(allTs[i][17]) === String(invoiceIdVal)) {
      await updateCell(SHEET.TIMESHEETS, rn, 18, '');
    }
  }

  const commAmount = computeCommission(eng, ms.custAmount, ms.billed);
  const margin = round2(ms.custAmount - ms.vendCost - commAmount);
  const paid = await sumPayments(invoiceIdVal);
  const custBal = round2(ms.custAmount - paid.custPaid);
  const vendBal = round2(ms.vendCost - paid.vendPaid);
  const today = startOfDay(new Date());
  const status = computeStatus(custBal, ms.custAmount, paid.custPaid, inv[19], today);

  inv[11] = ms.billed; inv[12] = ms.submitted;
  inv[13] = ms.custAmount; inv[14] = ms.vendCost;
  inv[15] = commAmount; inv[16] = margin;
  inv[21] = paid.custPaid; inv[22] = paid.vendPaid;
  inv[23] = Math.max(0, custBal); inv[24] = Math.max(0, vendBal);
  inv[29] = status;
  await updateRow(SHEET.INVOICES, invRow, inv);
}

export {
  SHEET, MONTH_NAMES,
  readSheet, appendRow, updateRow, updateCell, deleteRow, findRowIndex, nextId, invoiceId,
  num, round2, isoNow, parseDate, addDays, fmtDateMMDDYYYY, weekOfMonth,
  getEngagement, getBootstrapData, buildTimesheetRow,
  collectMonthTimesheets, sumPayments, regenerateInvoice,
  computeCommission, computeStatus, paymentFlag, startOfDay
};
