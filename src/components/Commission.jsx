import { useState } from 'react';
import toast from 'react-hot-toast';
import { useApp, COM, num, money, fmtDate } from '../context/AppContext';
import api from '../api';
import PageHeader from './PageHeader';
import SearchBar from './SearchBar';

export default function Commission() {
  const { commission, applyResult } = useApp();
  const [search, setSearch] = useState('');

  const filtered = commission.filter(r => {
    const q = search.toLowerCase();
    return !q || [r[COM.ID], r[COM.INV], r[COM.AGENTNAME], r[COM.STATUS]].some(v => String(v || '').toLowerCase().includes(q));
  });

  async function toggle(r) {
    const newStatus = r[COM.STATUS] === 'Paid' ? 'Pending' : 'Paid';
    try {
      const res = await api.setCommissionStatus(r[COM.ID], newStatus);
      applyResult(res, res.message);
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <PageHeader icon="bi-cash-coin" title="Commission">
        <SearchBar value={search} onChange={setSearch} />
      </PageHeader>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>ID</th><th>Invoice</th><th>Agent</th><th>Method</th><th>Basis</th><th>Commission</th><th>Status</th><th>Paid Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-4 text-muted">No commission records</td></tr>}
            {filtered.map(r => (
              <tr key={r[COM.ID]}>
                <td className="text-primary">{r[COM.ID]}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{r[COM.INV]}</td>
                <td>{r[COM.AGENTNAME]}</td>
                <td>{r[COM.METHOD]}</td>
                <td className="amount-cell">{money(r[COM.BASIS])}</td>
                <td className="amount-cell">{money(r[COM.AMT])}</td>
                <td><span className={`badge-status badge-${String(r[COM.STATUS]).toLowerCase()}`}>{r[COM.STATUS]}</span></td>
                <td>{r[COM.PAID] ? fmtDate(r[COM.PAID]) : '—'}</td>
                <td>
                  <button className="btn-icon" title={r[COM.STATUS] === 'Paid' ? 'Mark Pending' : 'Mark Paid'} onClick={() => toggle(r)}>
                    <i className={`bi ${r[COM.STATUS] === 'Paid' ? 'bi-arrow-counterclockwise' : 'bi-check-circle'}`}></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>
    </div>
  );
}
