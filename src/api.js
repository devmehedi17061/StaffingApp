const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json;
}

const api = {
  bootstrap: () => request('/bootstrap'),

  // Customers
  addCustomer: d => request('/customers', { method: 'POST', body: d }),
  updateCustomer: (id, d) => request(`/customers/${id}`, { method: 'PUT', body: d }),
  deleteCustomer: id => request(`/customers/${id}`, { method: 'DELETE' }),

  // Vendors
  addVendor: d => request('/vendors', { method: 'POST', body: d }),
  updateVendor: (id, d) => request(`/vendors/${id}`, { method: 'PUT', body: d }),
  deleteVendor: id => request(`/vendors/${id}`, { method: 'DELETE' }),

  // Agents
  addAgent: d => request('/agents', { method: 'POST', body: d }),
  updateAgent: (id, d) => request(`/agents/${id}`, { method: 'PUT', body: d }),
  deleteAgent: id => request(`/agents/${id}`, { method: 'DELETE' }),

  // Engagements
  addEngagement: d => request('/engagements', { method: 'POST', body: d }),
  updateEngagement: (id, d) => request(`/engagements/${id}`, { method: 'PUT', body: d }),
  deleteEngagement: id => request(`/engagements/${id}`, { method: 'DELETE' }),

  // Timesheets
  addTimesheet: d => request('/timesheets', { method: 'POST', body: d }),
  updateTimesheet: (id, d) => request(`/timesheets/${id}`, { method: 'PUT', body: d }),
  deleteTimesheet: id => request(`/timesheets/${id}`, { method: 'DELETE' }),

  // Invoices
  generateInvoice: d => request('/invoices/generate', { method: 'POST', body: d }),
  updateInvoiceExternal: (id, d) => request(`/invoices/${id}/external`, { method: 'PUT', body: d }),
  regenerateInvoice: id => request(`/invoices/${id}/regenerate`, { method: 'POST' }),
  deleteInvoice: id => request(`/invoices/${id}`, { method: 'DELETE' }),

  // Payments
  addPayment: d => request('/payments', { method: 'POST', body: d }),
  deletePayment: id => request(`/payments/${id}`, { method: 'DELETE' }),

  // Commission
  setCommissionStatus: (id, status) => request(`/commission/${id}/status`, { method: 'PUT', body: { status } }),
};

export default api;
