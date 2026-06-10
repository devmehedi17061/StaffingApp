import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

// Column index constants (match Google Sheet columns)
export const CUS = { ID: 0, NAME: 1, OWNER: 2, DAYS: 3, PHONE: 4, EMAIL: 5, ADDR: 6, STATUS: 7 };
export const VEN = { ID: 0, NAME: 1, TERMS: 2, CONTACT: 3, EMAIL: 4, ADDR: 5, STATUS: 6 };
export const AG = { ID: 0, NAME: 1, CTYPE: 2, RATE: 3, PHONE: 4, EMAIL: 5, STATUS: 6 };
export const ENG = { ID: 0, CUSTID: 1, CUSTNAME: 2, VENDID: 3, VENDNAME: 4, AGENTID: 5, AGENTNAME: 6, SCOPE: 7, CRATE: 8, VRATE: 9, CTERMS: 10, VTERMS: 11, CMETHOD: 12, CVALUE: 13, STATUS: 14, START: 15, NOTES: 16 };
export const TS = { ID: 0, ENG: 1, CUSTID: 2, VENDID: 3, YEAR: 4, MONTH: 5, WEEK: 6, START: 7, END: 8, DESC: 9, APPROVAL: 10, SUB: 11, BILL: 12, CRATE: 13, VRATE: 14, CAMT: 15, VCOST: 16, INVID: 17, NOTES: 18 };
export const INV = { ID: 0, DATE: 1, ENG: 2, CUSTID: 3, CUSTNAME: 4, VENDID: 5, VENDNAME: 6, AGENTID: 7, AGENTNAME: 8, YEAR: 9, MONTH: 10, TBILL: 11, TSUB: 12, CAMT: 13, VCOST: 14, COMM: 15, MARGIN: 16, CTERMS: 17, VTERMS: 18, CDUE: 19, VDUE: 20, CPAID: 21, VPAID: 22, CBAL: 23, VBAL: 24, CINVNO: 25, CINVAMT: 26, PLATFORM: 27, BANK: 28, STATUS: 29, NOTES: 30 };
export const PAY = { ID: 0, INV: 1, TYPE: 2, AMT: 3, DATE: 4, METHOD: 5, REF: 6, NOTES: 7 };
export const COM = { ID: 0, INV: 1, ENG: 2, AGENTID: 3, AGENTNAME: 4, METHOD: 5, BASIS: 6, AMT: 7, STATUS: 8, PAID: 9, NOTE: 10 };

export const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
export function money(v) { return '$' + num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function ym(y, m) { return (y || '?') + '-' + (MONTHS[parseInt(m, 10)] || m || '?'); }
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AppProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    customers: [], vendors: [], agents: [], engagements: [],
    timesheets: [], invoices: [], payments: [], commission: [],
    settings: [], customerList: [], dashboard: null,
    filterEngagementId: '',
  });

  const loadData = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true }));
      const res = await api.bootstrap();
      setState(s => ({ ...s, ...res.data, loading: false }));
    } catch (e) {
      toast.error('Failed to load: ' + e.message);
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  const applyResult = useCallback((res, successMsg) => {
    if (res.data) setState(s => ({ ...s, ...res.data }));
    if (successMsg) toast.success(res.message || successMsg);
  }, []);

  const setFilter = useCallback((engId) => {
    setState(s => ({ ...s, filterEngagementId: engId }));
  }, []);

  const engById = useCallback((id) => {
    return state.engagements.find(e => String(e[ENG.ID]) === String(id));
  }, [state.engagements]);

  return (
    <AppContext.Provider value={{ ...state, loadData, applyResult, setFilter, engById }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
