import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, PAY, INV, num, money, fmtDate } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

export default function Payments() {
  const { payments, invoices, applyResult } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ invoiceId: '', paymentType: 'Customer Received', amount: '', paymentDate: '', method: 'Bank Transfer', reference: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = payments.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[PAY.ID], r[PAY.INV], r[PAY.TYPE], r[PAY.METHOD]].some(v => String(v || '').toLowerCase().includes(q));
  });

  function openAdd() {
    setForm({ invoiceId: '', paymentType: 'Customer Received', amount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'Bank Transfer', reference: '', notes: '' });
    setShowModal(true);
  }

  async function save() {
    if (!form.invoiceId) { toast.error('Select an invoice'); return; }
    if (!form.amount || num(form.amount) <= 0) { toast.error('Amount required'); return; }
    setSaving(true);
    try {
      const res = await api.addPayment(form);
      applyResult(res, res.message); setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doDelete(id) {
    try { const res = await api.deletePayment(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-credit-card" title="Payments">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-lg me-1"></i>Record Payment</button>
      </PageHeader>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>ID</th><th>Invoice</th><th>Type</th><th>Amount</th><th>Date</th><th>Method</th><th>Reference</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-muted">No payments</td></tr>}
            {filtered.map(r => (
              <tr key={r[PAY.ID]}>
                <td className="text-primary">{r[PAY.ID]}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r[PAY.INV]}</td>
                <td><span className={`badge-status badge-${r[PAY.TYPE] === 'Customer Received' ? 'paid' : 'pending'}`}>{r[PAY.TYPE]}</span></td>
                <td className="amount-cell">{money(r[PAY.AMT])}</td>
                <td>{fmtDate(r[PAY.DATE])}</td>
                <td>{r[PAY.METHOD] || '—'}</td>
                <td>{r[PAY.REF] || '—'}</td>
                <td><button className="btn-icon danger" onClick={() => setConfirm(r[PAY.ID])}><i className="bi bi-trash"></i></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="dark-modal">
        <Modal.Header closeButton><Modal.Title><i className="bi bi-credit-card me-2"></i>Record Payment</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-12"><Form.Label>Invoice *</Form.Label>
              <Form.Select value={form.invoiceId} onChange={e => set('invoiceId', e.target.value)}>
                <option value="">Select...</option>
                {invoices.map(inv => <option key={inv[INV.ID]} value={inv[INV.ID]}>{inv[INV.ID]} — {inv[INV.CUSTNAME]} ({money(inv[INV.CBAL])} bal)</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6"><Form.Label>Type *</Form.Label>
              <Form.Select value={form.paymentType} onChange={e => set('paymentType', e.target.value)}>
                <option>Customer Received</option><option>Vendor Paid</option>
              </Form.Select>
            </div>
            <div className="col-md-6"><Form.Label>Amount *</Form.Label><Form.Control type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Date</Form.Label><Form.Control type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Method</Form.Label>
              <Form.Select value={form.method} onChange={e => set('method', e.target.value)}>
                <option>Bank Transfer</option><option>Wire</option><option>Check</option><option>ACH</option><option>Credit Card</option><option>Other</option>
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Reference</Form.Label><Form.Control value={form.reference} onChange={e => set('reference', e.target.value)} /></div>
            <div className="col-12"><Form.Label>Notes</Form.Label><Form.Control value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
      <ConfirmModal show={!!confirm} title="Delete Payment?" message={`Payment <b>${confirm}</b> will be removed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
