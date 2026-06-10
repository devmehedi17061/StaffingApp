import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, CUS } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

export default function Customers() {
  const { customers, applyResult } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const [form, setForm] = useState({ name: '', owner: '', paymentDays: 60, phone: '', email: '', address: '', status: 'Active' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = customers.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[CUS.ID], r[CUS.NAME], r[CUS.OWNER], r[CUS.EMAIL]].some(v => String(v || '').toLowerCase().includes(q));
  });

  function openAdd() {
    setEditRow(null);
    setForm({ name: '', owner: '', paymentDays: 60, phone: '', email: '', address: '', status: 'Active' });
    setShowModal(true);
  }
  function openEdit(r) {
    setEditRow(r);
    setForm({ name: r[CUS.NAME], owner: r[CUS.OWNER] || '', paymentDays: r[CUS.DAYS] || 60, phone: r[CUS.PHONE] || '', email: r[CUS.EMAIL] || '', address: r[CUS.ADDR] || '', status: r[CUS.STATUS] || 'Active' });
    setShowModal(true);
  }

  async function save() {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = editRow ? await api.updateCustomer(editRow[CUS.ID], form) : await api.addCustomer(form);
      applyResult(res, res.message);
      setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doDelete(id) {
    try {
      const res = await api.deleteCustomer(id);
      applyResult(res, res.message);
    } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-people" title="Customers">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-lg me-1"></i>Add Customer</button>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead><tr><th>ID</th><th>Name</th><th>Owner</th><th>Terms</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-muted">No customers</td></tr>}
                {filtered.map(r => (
                  <tr key={r[CUS.ID]}>
                    <td className="text-primary">{r[CUS.ID]}</td>
                    <td>{r[CUS.NAME]}</td>
                    <td>{r[CUS.OWNER] || '—'}</td>
                    <td>{r[CUS.DAYS] || 60} days</td>
                    <td>{r[CUS.PHONE] || '—'}</td>
                    <td>{r[CUS.EMAIL] || '—'}</td>
                    <td><span className={`badge-status badge-${String(r[CUS.STATUS]).toLowerCase() === 'active' ? 'paid' : 'pending'}`}>{r[CUS.STATUS]}</span></td>
                    <td>
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                      <button className="btn-icon danger" title="Delete" onClick={() => setConfirm(r[CUS.ID])}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="dark-modal" size="lg">
        <Modal.Header closeButton><Modal.Title>{editRow ? 'Edit' : 'Add'} Customer</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-6"><Form.Label>Name *</Form.Label><Form.Control value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="col-md-6"><Form.Label>Owner</Form.Label><Form.Control value={form.owner} onChange={e => set('owner', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Payment Days</Form.Label><Form.Control type="number" value={form.paymentDays} onChange={e => set('paymentDays', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Phone</Form.Label><Form.Control value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Email</Form.Label><Form.Control value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="col-md-8"><Form.Label>Address</Form.Label><Form.Control value={form.address} onChange={e => set('address', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>Status</Form.Label><Form.Select value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Inactive</option></Form.Select></div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal show={!!confirm} title="Delete Customer?" message={`Customer <b>${confirm}</b> will be removed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
