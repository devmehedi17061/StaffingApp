import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, VEN } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

export default function Vendors() {
  const { vendors, applyResult } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ name: '', paymentTerms: 45, contact: '', email: '', address: '', status: 'Active' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = vendors.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[VEN.ID], r[VEN.NAME], r[VEN.CONTACT], r[VEN.EMAIL]].some(v => String(v || '').toLowerCase().includes(q));
  });

  function openAdd() { setEditRow(null); setForm({ name: '', paymentTerms: 45, contact: '', email: '', address: '', status: 'Active' }); setShowModal(true); }
  function openEdit(r) { setEditRow(r); setForm({ name: r[VEN.NAME], paymentTerms: r[VEN.TERMS] || 45, contact: r[VEN.CONTACT] || '', email: r[VEN.EMAIL] || '', address: r[VEN.ADDR] || '', status: r[VEN.STATUS] || 'Active' }); setShowModal(true); }

  async function save() {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = editRow ? await api.updateVendor(editRow[VEN.ID], form) : await api.addVendor(form);
      applyResult(res, res.message); setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doDelete(id) {
    try { const res = await api.deleteVendor(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-truck" title="Vendors">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-lg me-1"></i>Add Vendor</button>
      </PageHeader>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>ID</th><th>Name</th><th>Terms</th><th>Contact</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-muted">No vendors</td></tr>}
            {filtered.map(r => (
              <tr key={r[VEN.ID]}>
                <td className="text-primary">{r[VEN.ID]}</td>
                <td>{r[VEN.NAME]}</td>
                <td>{r[VEN.TERMS] || 45} days</td>
                <td>{r[VEN.CONTACT] || '—'}</td>
                <td>{r[VEN.EMAIL] || '—'}</td>
                <td><span className={`badge-status badge-${String(r[VEN.STATUS]).toLowerCase() === 'active' ? 'paid' : 'pending'}`}>{r[VEN.STATUS]}</span></td>
                <td>
                  <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                  <button className="btn-icon danger" onClick={() => setConfirm(r[VEN.ID])}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="dark-modal" size="lg">
        <Modal.Header closeButton><Modal.Title>{editRow ? 'Edit' : 'Add'} Vendor</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-6"><Form.Label>Name *</Form.Label><Form.Control value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Payment Terms (Days)</Form.Label><Form.Control type="number" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Status</Form.Label><Form.Select value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Inactive</option></Form.Select></div>
            <div className="col-md-4"><Form.Label>Contact</Form.Label><Form.Control value={form.contact} onChange={e => set('contact', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Email</Form.Label><Form.Control value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Address</Form.Label><Form.Control value={form.address} onChange={e => set('address', e.target.value)} /></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
      <ConfirmModal show={!!confirm} title="Delete Vendor?" message={`Vendor <b>${confirm}</b> will be removed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
