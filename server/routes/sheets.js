import { Router } from 'express';
import {
  SHEET, MONTH_NAMES,
  readSheet, appendRow, updateRow, updateCell, deleteRow, findRowIndex, nextId, invoiceId,
  num, round2, isoNow, parseDate, addDays,
  getEngagement, getBootstrapData, buildTimesheetRow,
  collectMonthTimesheets, sumPayments, regenerateInvoice,
  computeCommission, computeStatus, startOfDay
} from '../googleSheets.js';

const router = Router();

// ============================================================
// BOOTSTRAP — single load
// ============================================================
router.get('/bootstrap', async (req, res) => {
  try {
    const data = await getBootstrapData();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: String(e.message || e) });
  }
});

// ============================================================
// CUSTOMERS
// ============================================================
router.post('/customers', async (req, res) => {
  try {
    const d = req.body;
    const id = await nextId(SHEET.CUSTOMERS, 'CUS');
    await appendRow(SHEET.CUSTOMERS, [id, d.name, d.owner || '', parseInt(d.paymentDays, 10) || 60,
      d.phone || '', d.email || '', d.address || '', d.status || 'Active', isoNow()]);
    res.json({ success: true, id, message: 'Customer added.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const d = req.body; const row = await findRowIndex(SHEET.CUSTOMERS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Customer not found.' });
    await updateRow(SHEET.CUSTOMERS, row, [req.params.id, d.name, d.owner || '', parseInt(d.paymentDays, 10) || 60,
      d.phone || '', d.email || '', d.address || '', d.status || 'Active', d.created || isoNow()]);
    res.json({ success: true, message: 'Customer updated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const row = await findRowIndex(SHEET.CUSTOMERS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Customer not found.' });
    await deleteRow(SHEET.CUSTOMERS, row);
    res.json({ success: true, message: 'Customer deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// VENDORS
// ============================================================
router.post('/vendors', async (req, res) => {
  try {
    const d = req.body;
    const id = await nextId(SHEET.VENDORS, 'VEN');
    await appendRow(SHEET.VENDORS, [id, d.name, parseInt(d.paymentTerms, 10) || 45,
      d.contact || '', d.email || '', d.address || '', d.status || 'Active', isoNow()]);
    res.json({ success: true, id, message: 'Vendor added.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/vendors/:id', async (req, res) => {
  try {
    const d = req.body; const row = await findRowIndex(SHEET.VENDORS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    await updateRow(SHEET.VENDORS, row, [req.params.id, d.name, parseInt(d.paymentTerms, 10) || 45,
      d.contact || '', d.email || '', d.address || '', d.status || 'Active', d.created || isoNow()]);
    res.json({ success: true, message: 'Vendor updated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/vendors/:id', async (req, res) => {
  try {
    const row = await findRowIndex(SHEET.VENDORS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    await deleteRow(SHEET.VENDORS, row);
    res.json({ success: true, message: 'Vendor deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// AGENTS
// ============================================================
router.post('/agents', async (req, res) => {
  try {
    const d = req.body;
    const id = await nextId(SHEET.AGENTS, 'AG');
    await appendRow(SHEET.AGENTS, [id, d.name, d.commissionType || 'Percentage',
      num(d.commissionRate) || 5, d.phone || '', d.email || '', d.status || 'Active', isoNow()]);
    res.json({ success: true, id, message: 'Agent added.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/agents/:id', async (req, res) => {
  try {
    const d = req.body; const row = await findRowIndex(SHEET.AGENTS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Agent not found.' });
    await updateRow(SHEET.AGENTS, row, [req.params.id, d.name, d.commissionType || 'Percentage',
      num(d.commissionRate) || 5, d.phone || '', d.email || '', d.status || 'Active', d.created || isoNow()]);
    res.json({ success: true, message: 'Agent updated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const row = await findRowIndex(SHEET.AGENTS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Agent not found.' });
    await deleteRow(SHEET.AGENTS, row);
    res.json({ success: true, message: 'Agent deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// ENGAGEMENTS
// ============================================================
function buildEngagementRow(id, d, created) {
  return [id, d.customerId, d.customerName, d.vendorId, d.vendorName,
    d.agentId || '', d.agentName || '', d.scope || '',
    num(d.customerRate), num(d.vendorRate),
    parseInt(d.customerTerms, 10) || 60, parseInt(d.vendorTerms, 10) || 45,
    d.commissionMethod || 'None', num(d.commissionValue),
    d.status || 'Active', parseDate(d.startDate) || isoNow(), d.notes || '', created];
}

router.post('/engagements', async (req, res) => {
  try {
    const d = req.body;
    if (!d.customerId || !d.vendorId) return res.status(400).json({ success: false, message: 'Customer and Vendor required.' });
    const id = await nextId(SHEET.ENGAGEMENTS, 'ENG');
    await appendRow(SHEET.ENGAGEMENTS, buildEngagementRow(id, d, isoNow()));
    res.json({ success: true, id, message: 'Engagement added.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/engagements/:id', async (req, res) => {
  try {
    const d = req.body; const row = await findRowIndex(SHEET.ENGAGEMENTS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Engagement not found.' });
    await updateRow(SHEET.ENGAGEMENTS, row, buildEngagementRow(req.params.id, d, d.created || isoNow()));
    res.json({ success: true, message: 'Engagement updated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/engagements/:id', async (req, res) => {
  try {
    const row = await findRowIndex(SHEET.ENGAGEMENTS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Engagement not found.' });
    await deleteRow(SHEET.ENGAGEMENTS, row);
    res.json({ success: true, message: 'Engagement deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// TIMESHEETS
// ============================================================
router.post('/timesheets', async (req, res) => {
  try {
    const d = req.body;
    const eng = await getEngagement(d.engagementId);
    if (!eng) return res.status(400).json({ success: false, message: 'Select a valid engagement.' });
    const id = await nextId(SHEET.TIMESHEETS, 'TS');
    d.invoiceId = '';
    await appendRow(SHEET.TIMESHEETS, buildTimesheetRow(id, d, eng, isoNow()));
    res.json({ success: true, id, message: 'Timesheet added.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/timesheets/:id', async (req, res) => {
  try {
    const d = req.body;
    const row = await findRowIndex(SHEET.TIMESHEETS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Timesheet not found.' });
    const eng = await getEngagement(d.engagementId);
    if (!eng) return res.status(400).json({ success: false, message: 'Engagement not found.' });
    // Read existing row to preserve invoiceId and created
    const existing = await readSheet(SHEET.TIMESHEETS);
    const existingRow = existing.find(r => String(r[0]) === String(req.params.id));
    d.invoiceId = existingRow ? existingRow[17] : '';
    const created = existingRow ? existingRow[19] : isoNow();
    await updateRow(SHEET.TIMESHEETS, row, buildTimesheetRow(req.params.id, d, eng, created));
    if (d.invoiceId) await regenerateInvoice(d.invoiceId);
    res.json({ success: true, message: 'Timesheet updated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/timesheets/:id', async (req, res) => {
  try {
    const row = await findRowIndex(SHEET.TIMESHEETS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Timesheet not found.' });
    const existing = await readSheet(SHEET.TIMESHEETS);
    const r = existing.find(x => String(x[0]) === String(req.params.id));
    const linkedInvoice = r ? r[17] : '';
    await deleteRow(SHEET.TIMESHEETS, row);
    if (linkedInvoice) await regenerateInvoice(linkedInvoice);
    res.json({ success: true, message: 'Timesheet deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// INVOICES
// ============================================================
router.post('/invoices/generate', async (req, res) => {
  try {
    const d = req.body;
    const eng = await getEngagement(d.engagementId);
    if (!eng) return res.status(400).json({ success: false, message: 'Select a valid engagement.' });
    const year = parseInt(d.year, 10), month = parseInt(d.month, 10);
    if (!year || !month) return res.status(400).json({ success: false, message: 'Year and Month required.' });

    const ms = await collectMonthTimesheets(d.engagementId, year, month);
    if (!ms.indices.length) return res.status(400).json({ success: false, message: 'No timesheets for ' + year + '-' + month });

    // Check existing
    const allInv = await readSheet(SHEET.INVOICES);
    const existingInv = allInv.find(r => String(r[2]) === String(d.engagementId) && parseInt(r[9], 10) === year && parseInt(r[10], 10) === month);
    if (existingInv) {
      await regenerateInvoice(existingInv[0]);
      return res.json({ success: true, id: existingInv[0], message: 'Invoice regenerated: ' + existingInv[0], data: await getBootstrapData() });
    }

    const id = await invoiceId(year, month);
    const invDate = parseDate(d.invoiceDate || new Date());
    const custTerms = num(eng[10]) || 60;
    const vendTerms = num(eng[11]) || 45;
    const custDue = addDays(invDate, custTerms);
    const vendDue = addDays(invDate, vendTerms);
    const commAmount = computeCommission(eng, ms.custAmount, ms.billed);
    const margin = round2(ms.custAmount - ms.vendCost - commAmount);
    const today = startOfDay(new Date());
    const status = computeStatus(ms.custAmount, ms.custAmount, 0, custDue, today);

    await appendRow(SHEET.INVOICES, [
      id, invDate, d.engagementId, eng[1], eng[2], eng[3], eng[4], eng[5], eng[6],
      year, month, ms.billed, ms.submitted, ms.custAmount, ms.vendCost, commAmount, margin,
      custTerms, vendTerms, custDue, vendDue, 0, 0, ms.custAmount, ms.vendCost,
      '', '', d.platform || '', '', status, d.notes || '', isoNow()
    ]);

    // Stamp timesheets
    for (const rn of ms.indices) {
      await updateCell(SHEET.TIMESHEETS, rn, 18, id);
    }

    res.json({ success: true, id, message: 'Invoice ' + id + ' generated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.put('/invoices/:id/external', async (req, res) => {
  try {
    const d = req.body;
    const row = await findRowIndex(SHEET.INVOICES, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    await updateCell(SHEET.INVOICES, row, 26, d.customerInvoiceNumber || '');
    await updateCell(SHEET.INVOICES, row, 27, num(d.customerInvoiceAmount));
    await updateCell(SHEET.INVOICES, row, 28, d.platform || '');
    await updateCell(SHEET.INVOICES, row, 29, d.bankReceiveStatus || '');
    await updateCell(SHEET.INVOICES, row, 31, d.notes || '');
    res.json({ success: true, message: 'Invoice details saved.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.post('/invoices/:id/regenerate', async (req, res) => {
  try {
    await regenerateInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice regenerated.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    // Free timesheets
    const allTs = await readSheet(SHEET.TIMESHEETS);
    for (let i = 0; i < allTs.length; i++) {
      if (String(allTs[i][17]) === String(req.params.id)) {
        await updateCell(SHEET.TIMESHEETS, i + 2, 18, '');
      }
    }
    // Delete commission
    const allCom = await readSheet(SHEET.COMMISSION);
    for (let i = allCom.length - 1; i >= 0; i--) {
      if (String(allCom[i][1]) === String(req.params.id)) {
        await deleteRow(SHEET.COMMISSION, i + 2);
      }
    }
    const row = await findRowIndex(SHEET.INVOICES, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    await deleteRow(SHEET.INVOICES, row);
    res.json({ success: true, message: 'Invoice deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// PAYMENTS
// ============================================================
router.post('/payments', async (req, res) => {
  try {
    const d = req.body;
    const id = await nextId(SHEET.PAYMENTS, 'PAY');
    await appendRow(SHEET.PAYMENTS, [id, d.invoiceId, d.paymentType, num(d.amount),
      parseDate(d.paymentDate), d.method || 'Bank Transfer', d.reference || '', d.notes || '', isoNow()]);
    if (d.invoiceId) await regenerateInvoice(d.invoiceId);
    res.json({ success: true, id, message: 'Payment recorded.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const allPay = await readSheet(SHEET.PAYMENTS);
    const pay = allPay.find(r => String(r[0]) === String(req.params.id));
    const linkedInvoice = pay ? pay[1] : '';
    const row = await findRowIndex(SHEET.PAYMENTS, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Payment not found.' });
    await deleteRow(SHEET.PAYMENTS, row);
    if (linkedInvoice) await regenerateInvoice(linkedInvoice);
    res.json({ success: true, message: 'Payment deleted.', data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

// ============================================================
// COMMISSION STATUS
// ============================================================
router.put('/commission/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const row = await findRowIndex(SHEET.COMMISSION, req.params.id);
    if (row < 0) return res.status(404).json({ success: false, message: 'Commission not found.' });
    await updateCell(SHEET.COMMISSION, row, 9, status);
    await updateCell(SHEET.COMMISSION, row, 10, status === 'Paid' ? isoNow() : '');
    if (status === 'Paid') await updateCell(SHEET.COMMISSION, row, 11, '');
    res.json({ success: true, message: 'Commission marked ' + status, data: await getBootstrapData() });
  } catch (e) { res.status(500).json({ success: false, message: String(e.message || e) }); }
});

export default router;
