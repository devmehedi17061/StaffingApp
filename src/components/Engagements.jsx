import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, ENG, CUS, VEN, AG, num } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

export default function Engagements() {
  const { engagements, customers, vendors, agents, applyResult } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const emptyForm = { customerId: '', customerName: '', vendorId: '', vendorName: '', agentId: '', agentName: '', scope: '', customerRate: '', vendorRate: '', customerTerms: 60, vendorTerms: 45, commissionMethod: 'None', commissionValue: 0, status: 'Active', startDate: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = engagements.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[ENG.ID], r[ENG.CUSTNAME], r[ENG.VENDNAME], r[ENG.SCOPE]].some(v => String(v || '').toLowerCase().includes(q));
  });

  function openAdd() { setEditRow(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(r) {
    setEditRow(r);
    setForm({
      customerId: r[ENG.CUSTID], customerName: r[ENG.CUSTNAME], vendorId: r[ENG.VENDID], vendorName: r[ENG.VENDNAME],
      agentId: r[ENG.AGENTID] || '', agentName: r[ENG.AGENTNAME] || '', scope: r[ENG.SCOPE] || '',
      customerRate: r[ENG.CRATE], vendorRate: r[ENG.VRATE], customerTerms: r[ENG.CTERMS] || 60, vendorTerms: r[ENG.VTERMS] || 45,
      commissionMethod: r[ENG.CMETHOD] || 'None', commissionValue: r[ENG.CVALUE] || 0,
      status: r[ENG.STATUS] || 'Active', startDate: r[ENG.START] ? r[ENG.START].split('T')[0] : '', notes: r[ENG.NOTES] || ''
    });
    setShowModal(true);
  }

  function onCustomerChange(id) {
    const c = customers.find(r => String(r[CUS.ID]) === id);
    set('customerId', id);
    if (c) { set('customerName', c[CUS.NAME]); set('customerTerms', c[CUS.DAYS] || 60); }
  }
  function onVendorChange(id) {
    const v = vendors.find(r => String(r[VEN.ID]) === id);
    set('vendorId', id);
    if (v) { set('vendorName', v[VEN.NAME]); set('vendorTerms', v[VEN.TERMS] || 45); }
  }
  function onAgentChange(id) {
    const a = agents.find(r => String(r[AG.ID]) === id);
    set('agentId', id);
    if (a) { set('agentName', a[AG.NAME]); set('commissionMethod', a[AG.CTYPE] || 'Percentage'); set('commissionValue', a[AG.RATE] || 5); }
    else { set('agentName', ''); }
  }

  async function save() {
    if (!form.customerId || !form.vendorId) { toast.error('Customer and Vendor required'); return; }
    setSaving(true);
    try {
      const res = editRow ? await api.updateEngagement(editRow[ENG.ID], form) : await api.addEngagement(form);
      applyResult(res, res.message); setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doDelete(id) {
    try { const res = await api.deleteEngagement(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-link-45deg" title="Engagements">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-lg me-1"></i>Add Engagement</button>
      </PageHeader>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>ID</th><th>Customer</th><th>Vendor</th><th>Agent</th><th>Cust Rate</th><th>Vend Rate</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-muted">No engagements</td></tr>}
            {filtered.map(r => (
              <tr key={r[ENG.ID]}>
                <td className="text-primary">{r[ENG.ID]}</td>
                <td>{r[ENG.CUSTNAME]}</td>
                <td>{r[ENG.VENDNAME]}</td>
                <td>{r[ENG.AGENTNAME] || '—'}</td>
                <td className="amount-cell">${num(r[ENG.CRATE])}</td>
                <td className="amount-cell">${num(r[ENG.VRATE])}</td>
                <td><span className={`badge-status badge-${String(r[ENG.STATUS]).toLowerCase() === 'active' ? 'paid' : 'pending'}`}>{r[ENG.STATUS]}</span></td>
                <td>
                  <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                  <button className="btn-icon danger" onClick={() => setConfirm(r[ENG.ID])}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="dark-modal" size="lg">
        <Modal.Header closeButton><Modal.Title>{editRow ? 'Edit' : 'Add'} Engagement</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-4"><Form.Label>Customer *</Form.Label>
              <Form.Select value={form.customerId} onChange={e => onCustomerChange(e.target.value)}>
                <option value="">Select...</option>
                {customers.map(c => <option key={c[CUS.ID]} value={c[CUS.ID]}>{c[CUS.NAME]} ({c[CUS.ID]})</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Vendor *</Form.Label>
              <Form.Select value={form.vendorId} onChange={e => onVendorChange(e.target.value)}>
                <option value="">Select...</option>
                {vendors.map(v => <option key={v[VEN.ID]} value={v[VEN.ID]}>{v[VEN.NAME]} ({v[VEN.ID]})</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Agent</Form.Label>
              <Form.Select value={form.agentId} onChange={e => onAgentChange(e.target.value)}>
                <option value="">None</option>
                {agents.map(a => <option key={a[AG.ID]} value={a[AG.ID]}>{a[AG.NAME]} ({a[AG.ID]})</option>)}
              </Form.Select>
            </div>
            <div className="col-md-12"><Form.Label>Scope</Form.Label><Form.Control value={form.scope} onChange={e => set('scope', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Customer Rate ($/hr)</Form.Label><Form.Control type="number" step="0.01" value={form.customerRate} onChange={e => set('customerRate', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Vendor Rate ($/hr)</Form.Label><Form.Control type="number" step="0.01" value={form.vendorRate} onChange={e => set('vendorRate', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Customer Terms</Form.Label><Form.Control type="number" value={form.customerTerms} onChange={e => set('customerTerms', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Vendor Terms</Form.Label><Form.Control type="number" value={form.vendorTerms} onChange={e => set('vendorTerms', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Commission Method</Form.Label>
              <Form.Select value={form.commissionMethod} onChange={e => set('commissionMethod', e.target.value)}>
                <option>None</option><option>Percentage</option><option>Fixed Monthly</option><option>Per Billed Hour</option>
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Commission Value</Form.Label><Form.Control type="number" step="0.01" value={form.commissionValue} onChange={e => set('commissionValue', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Status</Form.Label><Form.Select value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Inactive</option><option>Completed</option></Form.Select></div>
            <div className="col-md-6"><Form.Label>Start Date</Form.Label><Form.Control type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
            <div className="col-md-6"><Form.Label>Notes</Form.Label><Form.Control value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
      <ConfirmModal show={!!confirm} title="Delete Engagement?" message={`Engagement <b>${confirm}</b> and related data will be removed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
