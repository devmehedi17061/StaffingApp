import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, INV, ENG, MONTHS, num, money, ym, fmtDate } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

export default function Invoices() {
  const { invoices, engagements, applyResult } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const [genForm, setGenForm] = useState({ engagementId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1, invoiceDate: '', platform: '', notes: '' });
  const [editForm, setEditForm] = useState({ customerInvoiceNumber: '', customerInvoiceAmount: '', platform: '', bankReceiveStatus: '', notes: '' });

  const filtered = invoices.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || [r[INV.ID], r[INV.CUSTNAME], r[INV.VENDNAME]].some(v => String(v || '').toLowerCase().includes(q));
    const matchStatus = !statusFilter || r[INV.STATUS] === statusFilter;
    return matchSearch && matchStatus;
  });

  function openGenerate() {
    setGenForm({ engagementId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1, invoiceDate: new Date().toISOString().split('T')[0], platform: '', notes: '' });
    setShowGenerate(true);
  }

  function openEdit(r) {
    setEditRow(r);
    setEditForm({
      customerInvoiceNumber: r[INV.CINVNO] || '', customerInvoiceAmount: r[INV.CINVAMT] || '',
      platform: r[INV.PLATFORM] || '', bankReceiveStatus: r[INV.BANK] || '', notes: r[INV.NOTES] || ''
    });
    setShowEdit(true);
  }

  async function generate() {
    if (!genForm.engagementId) { toast.error('Select an engagement'); return; }
    setSaving(true);
    try {
      const res = await api.generateInvoice(genForm);
      applyResult(res, res.message); setShowGenerate(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await api.updateInvoiceExternal(editRow[INV.ID], editForm);
      applyResult(res, res.message); setShowEdit(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doRegenerate(id) {
    try { const res = await api.regenerateInvoice(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
  }

  async function doDelete(id) {
    try { const res = await api.deleteInvoice(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-receipt" title="Invoices">
        <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All Status</option><option>Pending</option><option>Partial</option><option>Paid</option><option>Overdue</option>
        </Form.Select>
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openGenerate}><i className="bi bi-plus-lg me-1"></i>Generate Invoice</button>
      </PageHeader>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>Invoice ID</th><th>Date</th><th>Customer</th><th>Vendor</th><th>Y-M</th><th>Cust Amt</th><th>Vend Cost</th><th>Margin</th><th>Cust Bal</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={11} className="text-center py-4 text-muted">No invoices</td></tr>}
            {filtered.map(r => (
              <tr key={r[INV.ID]}>
                <td className="text-primary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r[INV.ID]}</td>
                <td>{fmtDate(r[INV.DATE])}</td>
                <td>{r[INV.CUSTNAME]}</td>
                <td>{r[INV.VENDNAME]}</td>
                <td>{ym(r[INV.YEAR], r[INV.MONTH])}</td>
                <td className="amount-cell">{money(r[INV.CAMT])}</td>
                <td className="amount-cell amount-negative">{money(r[INV.VCOST])}</td>
                <td className="amount-cell text-success">{money(r[INV.MARGIN])}</td>
                <td className="amount-cell">{money(r[INV.CBAL])}</td>
                <td><span className={`badge-status badge-${String(r[INV.STATUS]).toLowerCase()}`}>{r[INV.STATUS]}</span></td>
                <td>
                  <button className="btn-icon" title="Edit Details" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                  <button className="btn-icon" title="Regenerate" onClick={() => doRegenerate(r[INV.ID])}><i className="bi bi-arrow-clockwise"></i></button>
                  <button className="btn-icon danger" title="Delete" onClick={() => setConfirm(r[INV.ID])}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>

      {/* GENERATE INVOICE MODAL */}
      <Modal show={showGenerate} onHide={() => setShowGenerate(false)} centered className="dark-modal">
        <Modal.Header closeButton><Modal.Title><i className="bi bi-receipt me-2"></i>Generate Monthly Invoice</Modal.Title></Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Invoice ID format: <b>invoice-Month-Year</b> (e.g. invoice-Jun-2026)</p>
          <div className="row g-3">
            <div className="col-12"><Form.Label>Engagement *</Form.Label>
              <Form.Select value={genForm.engagementId} onChange={e => setGenForm(f => ({ ...f, engagementId: e.target.value }))}>
                <option value="">Select...</option>
                {engagements.map(e => <option key={e[ENG.ID]} value={e[ENG.ID]}>{e[ENG.CUSTNAME]} \u2194 {e[ENG.VENDNAME]} ({e[ENG.ID]})</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Year</Form.Label><Form.Control type="number" value={genForm.year} onChange={e => setGenForm(f => ({ ...f, year: e.target.value }))} /></div>
            <div className="col-md-4"><Form.Label>Month</Form.Label>
              <Form.Select value={genForm.month} onChange={e => setGenForm(f => ({ ...f, month: e.target.value }))}>
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Invoice Date</Form.Label><Form.Control type="date" value={genForm.invoiceDate} onChange={e => setGenForm(f => ({ ...f, invoiceDate: e.target.value }))} /></div>
            <div className="col-md-6"><Form.Label>Platform</Form.Label><Form.Control value={genForm.platform} onChange={e => setGenForm(f => ({ ...f, platform: e.target.value }))} /></div>
            <div className="col-md-6"><Form.Label>Notes</Form.Label><Form.Control value={genForm.notes} onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
          <Button variant="primary" onClick={generate} disabled={saving}>{saving ? 'Generating...' : 'Generate Invoice'}</Button>
        </Modal.Footer>
      </Modal>

      {/* EDIT INVOICE EXTERNAL FIELDS */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered className="dark-modal">
        <Modal.Header closeButton><Modal.Title>Edit Invoice Details</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-6"><Form.Label>Customer Invoice #</Form.Label><Form.Control value={editForm.customerInvoiceNumber} onChange={e => setEditForm(f => ({ ...f, customerInvoiceNumber: e.target.value }))} /></div>
            <div className="col-md-6"><Form.Label>Customer Invoice Amount</Form.Label><Form.Control type="number" value={editForm.customerInvoiceAmount} onChange={e => setEditForm(f => ({ ...f, customerInvoiceAmount: e.target.value }))} /></div>
            <div className="col-md-6"><Form.Label>Platform</Form.Label><Form.Control value={editForm.platform} onChange={e => setEditForm(f => ({ ...f, platform: e.target.value }))} /></div>
            <div className="col-md-6"><Form.Label>Bank Receive Status</Form.Label><Form.Control value={editForm.bankReceiveStatus} onChange={e => setEditForm(f => ({ ...f, bankReceiveStatus: e.target.value }))} /></div>
            <div className="col-12"><Form.Label>Notes</Form.Label><Form.Control value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal show={!!confirm} title="Delete Invoice?" message={`Invoice <b>${confirm}</b> will be removed. Timesheets will be freed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
