import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useApp, TS, ENG, MONTHS, num, money, ym, fmtDate } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

function fmtDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
function fmtMMDDYYYY(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getDate().toString().padStart(2, '0') + '/' + d.getFullYear();
}

export default function Timesheets() {
  const { timesheets, engagements, filterEngagementId, applyResult, engById } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [billTouched, setBillTouched] = useState(false);

  const emptyForm = {
    engagementId: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    weekNo: '', approvalStatus: 'Approved', startDate: '', endDate: '',
    description: '', submittedHours: '', billedHours: '', notes: ''
  };
  const [form, setForm] = useState(emptyForm);
  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  // Auto-generate description and week when dates or approval change
  useEffect(() => {
    if (form.startDate) {
      const sd = new Date(form.startDate + 'T00:00:00');
      setForm(f => ({ ...f, weekNo: Math.ceil(sd.getDate() / 7) }));
    }
    if (form.startDate && form.endDate) {
      const desc = 'Add Time Sheet For ' + fmtMMDDYYYY(form.startDate) + ' - ' + fmtMMDDYYYY(form.endDate) + ' (' + (form.approvalStatus || 'Approved') + ')';
      setForm(f => ({ ...f, description: desc }));
    }
  }, [form.startDate, form.endDate, form.approvalStatus]);

  // Auto-copy submitted to billed
  useEffect(() => {
    if (!billTouched && form.submittedHours !== '') {
      setForm(f => ({ ...f, billedHours: f.submittedHours }));
    }
  }, [form.submittedHours, billTouched]);

  // Live calculation
  const eng = engById(form.engagementId);
  const custRate = eng ? num(eng[ENG.CRATE]) : 0;
  const vendRate = eng ? num(eng[ENG.VRATE]) : 0;
  const sub = num(form.submittedHours);
  const bill = form.billedHours === '' ? sub : num(form.billedHours);
  const cAmt = bill * custRate;
  const vCost = sub * vendRate;

  let rows = timesheets.slice();
  if (filterEngagementId) rows = rows.filter(r => String(r[TS.ENG]) === String(filterEngagementId));
  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[TS.ID], r[TS.ENG], r[TS.DESC], r[TS.APPROVAL]].some(v => String(v || '').toLowerCase().includes(q));
  });

  function engLabel(engId) {
    const e = engById(engId);
    return e ? e[ENG.CUSTNAME] + ' \u2194 ' + e[ENG.VENDNAME] : engId;
  }

  function openAdd() {
    setEditRow(null); setBillTouched(false);
    setForm({ ...emptyForm, engagementId: filterEngagementId || '' });
    setShowModal(true);
  }
  function openEdit(r) {
    setEditRow(r); setBillTouched(true);
    setForm({
      engagementId: r[TS.ENG], year: r[TS.YEAR], month: r[TS.MONTH], weekNo: r[TS.WEEK] || '',
      approvalStatus: r[TS.APPROVAL] || 'Pending',
      startDate: fmtDateInput(r[TS.START]), endDate: fmtDateInput(r[TS.END]),
      description: r[TS.DESC] || '', submittedHours: r[TS.SUB], billedHours: r[TS.BILL], notes: r[TS.NOTES] || ''
    });
    setShowModal(true);
  }

  function parseTsDesc() {
    const s = form.description;
    const m = s.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\s*[-\u2013to]+\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
    if (m) {
      const yr = y => { y = parseInt(y, 10); return y < 100 ? 2000 + y : y; };
      const s1 = new Date(yr(m[3]), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
      const e1 = new Date(yr(m[6]), parseInt(m[4], 10) - 1, parseInt(m[5], 10));
      setForm(f => ({
        ...f,
        startDate: s1.toISOString().split('T')[0],
        endDate: e1.toISOString().split('T')[0],
        year: e1.getFullYear(),
        month: e1.getMonth() + 1
      }));
    }
    const a = s.match(/\((approved|pending|rejected)\)/i);
    if (a) {
      const w = a[1][0].toUpperCase() + a[1].slice(1).toLowerCase();
      set('approvalStatus', w);
    }
    if (!m && !a) toast('Could not parse — fill fields manually', { icon: '\u2139\uFE0F' });
  }

  async function save() {
    if (!form.engagementId) { toast.error('Select an engagement'); return; }
    if (form.submittedHours === '' || !(num(form.submittedHours) >= 0)) { toast.error('Submitted hours required'); return; }
    setSaving(true);
    try {
      const res = editRow
        ? await api.updateTimesheet(editRow[TS.ID], form)
        : await api.addTimesheet(form);
      applyResult(res, res.message); setShowModal(false);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function doDelete(id) {
    try { const res = await api.deleteTimesheet(id); applyResult(res, res.message); } catch (e) { toast.error(e.message); }
    setConfirm(null);
  }

  return (
    <div>
      <PageHeader icon="bi-calendar-week" title="Timesheets">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={openAdd}><i className="bi bi-plus-lg me-1"></i>Add Timesheet</button>
      </PageHeader>

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead>
            <tr><th>ID</th><th>Engagement</th><th>Y-M</th><th>WK</th><th>Start</th><th>End</th><th>Approval</th><th>Sub Hrs</th><th>Bill Hrs</th><th>Cust Amt</th><th>Vend Cost</th><th>Invoiced</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={13} className="text-center py-4 text-muted">No timesheets</td></tr>}
            {filtered.map(r => (
              <tr key={r[TS.ID]}>
                <td className="text-primary">{r[TS.ID]}</td>
                <td>{engLabel(r[TS.ENG])}</td>
                <td>{ym(r[TS.YEAR], r[TS.MONTH])}</td>
                <td>{r[TS.WEEK] || '\u2014'}</td>
                <td>{fmtDate(r[TS.START])}</td>
                <td>{fmtDate(r[TS.END])}</td>
                <td><span className={`badge-status badge-${String(r[TS.APPROVAL]).toLowerCase() === 'approved' ? 'paid' : 'pending'}`}>{r[TS.APPROVAL] || 'Pending'}</span></td>
                <td className="amount-cell">{r[TS.SUB]}</td>
                <td className="amount-cell">{r[TS.BILL]}</td>
                <td className="amount-cell">{money(r[TS.CAMT])}</td>
                <td className="amount-cell amount-negative">{money(r[TS.VCOST])}</td>
                <td>{r[TS.INVID] ? <span className="text-primary" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r[TS.INVID]}</span> : '\u2014'}</td>
                <td>
                  <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                  <button className="btn-icon danger" onClick={() => setConfirm(r[TS.ID])}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>

      {/* ADD / EDIT TIMESHEET MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="dark-modal" size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${editRow ? 'bi-pencil-square' : 'bi-calendar-week'} me-2`}></i>
            {editRow ? 'Edit Timesheet ' + editRow[TS.ID] : 'Add Timesheet'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editRow && editRow[TS.INVID] && (
            <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '12px' }}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              This timesheet is on invoice <b>{editRow[TS.INVID]}</b> — saving will regenerate that invoice.
            </div>
          )}
          <div className="row g-3">
            <div className="col-md-12"><Form.Label>Engagement *</Form.Label>
              <Form.Select value={form.engagementId} onChange={e => set('engagementId', e.target.value)}>
                <option value="">Select Engagement...</option>
                {engagements.map(e => <option key={e[ENG.ID]} value={e[ENG.ID]}>{e[ENG.CUSTNAME]} \u2194 {e[ENG.VENDNAME]} ({e[ENG.ID]})</option>)}
              </Form.Select>
            </div>
            <div className="col-md-3"><Form.Label>Year *</Form.Label><Form.Control type="number" value={form.year} onChange={e => set('year', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Month *</Form.Label>
              <Form.Select value={form.month} onChange={e => set('month', e.target.value)}>
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-3"><Form.Label>Week No</Form.Label><Form.Control type="number" value={form.weekNo} onChange={e => set('weekNo', e.target.value)} /></div>
            <div className="col-md-3"><Form.Label>Approval</Form.Label>
              <Form.Select value={form.approvalStatus} onChange={e => set('approvalStatus', e.target.value)}>
                <option>Approved</option><option>Pending</option><option>Rejected</option>
              </Form.Select>
            </div>
            <div className="col-md-4"><Form.Label>Start Date</Form.Label><Form.Control type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
            <div className="col-md-4"><Form.Label>End Date</Form.Label><Form.Control type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
            <div className="col-md-4">
              <Form.Label>&nbsp;</Form.Label>
              <Button variant="outline-secondary" className="w-100" onClick={parseTsDesc}>
                <i className="bi bi-magic me-1"></i> Parse from description
              </Button>
            </div>
            <div className="col-md-12"><Form.Label>Description</Form.Label>
              <Form.Control value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add Time Sheet For MM/DD/YYYY - MM/DD/YYYY (Approved)" />
            </div>
            <div className="col-md-3"><Form.Label>Submitted Hours *</Form.Label>
              <Form.Control type="number" step="0.01" value={form.submittedHours} onChange={e => set('submittedHours', e.target.value)} placeholder="40" />
            </div>
            <div className="col-md-3"><Form.Label>Billed Hours</Form.Label>
              <Form.Control type="number" step="0.01" value={form.billedHours} onChange={e => { setBillTouched(true); set('billedHours', e.target.value); }} placeholder="= submitted" />
            </div>
            <div className="col-md-6"><Form.Label>Notes</Form.Label><Form.Control value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" /></div>
          </div>

          <div className="calc-box mt-3">
            <div className="calc-title">Live Calculation</div>
            <div className="calc-row">
              <div><span className="calc-label">Customer Amount (billed x cust rate)</span><br /><span className="calc-value text-primary">{money(cAmt)}</span></div>
              <div><span className="calc-label">Vendor Cost (submitted x vend rate)</span><br /><span className="calc-value text-warning">{money(vCost)}</span></div>
              <div><span className="calc-label">Margin</span><br /><span className="calc-value text-success">{money(cAmt - vCost)}</span></div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal show={!!confirm} title="Delete Timesheet?" message={`Timesheet <b>${confirm}</b> will be removed.`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  );
}
