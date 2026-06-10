import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Vendors from './components/Vendors';
import Agents from './components/Agents';
import Engagements from './components/Engagements';
import Timesheets from './components/Timesheets';
import Invoices from './components/Invoices';
import Payments from './components/Payments';
import Commission from './components/Commission';
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { loading, loadData } = useApp();

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/engagements" element={<Engagements />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/commission" element={<Commission />} />
      </Route>
    </Routes>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Toaster position="top-right" toastOptions={{
      style: {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#1e293b',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.1)',
      }
    }} />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <ThemedToaster />
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
