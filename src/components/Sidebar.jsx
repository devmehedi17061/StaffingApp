import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { to: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: '/customers', icon: 'bi-people', label: 'Customers' },
  { to: '/vendors', icon: 'bi-truck', label: 'Vendors' },
  { to: '/agents', icon: 'bi-person-badge', label: 'Agents' },
  { to: '/engagements', icon: 'bi-link-45deg', label: 'Engagements' },
  { to: '/timesheets', icon: 'bi-calendar-week', label: 'Timesheets' },
  { to: '/invoices', icon: 'bi-receipt', label: 'Invoices' },
  { to: '/payments', icon: 'bi-credit-card', label: 'Payments' },
  { to: '/commission', icon: 'bi-cash-coin', label: 'Commission' },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <i className="bi bi-building me-2"></i>
        <span>Staffing System</span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <i className={`bi ${n.icon}`}></i>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </div>
  );
}
