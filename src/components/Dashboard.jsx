import { useApp, money } from '../context/AppContext';
import LoadingSpinner from './LoadingSpinner';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}><i className={`bi ${icon}`}></i></div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { dashboard, loading } = useApp();
  if (loading || !dashboard) return <LoadingSpinner />;
  const d = dashboard;

  return (
    <div>
      <div className="page-header">
        <h4 className="page-title"><i className="bi bi-speedometer2 me-2"></i>Dashboard</h4>
      </div>

      <div className="stats-grid">
        <StatCard icon="bi-arrow-down-circle" label="Total Receivable" value={money(d.totalReceivable)} color="var(--accent-blue)" />
        <StatCard icon="bi-arrow-up-circle" label="Total Payable" value={money(d.totalPayable)} color="var(--accent-orange)" />
        <StatCard icon="bi-graph-up" label="Total Margin" value={money(d.totalMargin)} color="var(--accent-green)" />
        <StatCard icon="bi-exclamation-triangle" label="Overdue (Customer)" value={money(d.overdueCustomer)} color="var(--accent-red)" />
        <StatCard icon="bi-clock" label="Due Soon (Customer)" value={money(d.dueSoonCustomer)} color="var(--accent-orange)" />
        <StatCard icon="bi-exclamation-triangle" label="Overdue (Vendor)" value={money(d.overdueVendor)} color="var(--accent-red)" />
        <StatCard icon="bi-cash-coin" label="Pending Commission" value={money(d.pendingCommission)} color="var(--accent-purple)" />
        <StatCard icon="bi-receipt" label="Total Invoices" value={d.totalInvoices} color="var(--text-secondary)" />
      </div>

      <div className="card mt-4">
        <div className="card-header"><h6 className="mb-0">Invoice Status Breakdown</h6></div>
        <div className="card-body">
          <div className="d-flex gap-4 flex-wrap">
            {Object.entries(d.statusCount).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="fs-4 fw-bold">{count}</div>
                <span className={`badge-status badge-${status.toLowerCase()}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {d.recentInvoices.length > 0 && (
        <div className="card mt-4">
          <div className="card-header"><h6 className="mb-0">Recent Invoices</h6></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr><th>ID</th><th>Customer</th><th>Vendor</th><th>Amount</th><th>Balance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {d.recentInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="text-primary">{inv.id}</td>
                      <td>{inv.customer}</td>
                      <td>{inv.vendor}</td>
                      <td className="amount-cell">{money(inv.amount)}</td>
                      <td className="amount-cell">{money(inv.customerBalance)}</td>
                      <td><span className={`badge-status badge-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
