(() => {
  const state = { dashboard: null, rows: [], columns: [], moduleRequest: 0, activeForm: null, dashboardRequest: 0 };
  const pages = {
    dashboard: { title: 'Portfolio overview' },
    customers: { title: 'Customers', method: 'getCustomers', description: 'Registered borrowers and account status.', columns: [['name', 'Customer'], ['phone', 'Phone'], ['customerStatus', 'Status'], ['registrationDate', 'Registered']] },
    loans: { title: 'Loans', method: 'getLoans', description: 'Current lending accounts and receivables.', columns: [['loanId', 'Loan'], ['customerName', 'Customer'], ['principal', 'Principal', 'money'], ['outstandingBalance', 'Outstanding', 'money'], ['dueDate', 'Due date'], ['status', 'Status']] },
    payments: { title: 'Payments', method: 'getPayments', description: 'Payments recorded against lending accounts.', columns: [['paymentDate', 'Date'], ['loanId', 'Loan'], ['customerName', 'Customer'], ['amount', 'Amount', 'money'], ['paymentMethod', 'Method'], ['reference', 'Reference']] },
    collections: { title: 'Collections', method: 'getCollections', description: 'Collection activity and promises to pay.', columns: [['collectionDate', 'Date'], ['customerName', 'Customer'], ['phone', 'Phone'], ['amountPromised', 'Promised', 'money'], ['amountReceived', 'Received', 'money'], ['collectionStatus', 'Status']] },
    ledger: { title: 'Interest ledger', method: 'getInterest', description: 'Interest periods recorded for loan accounts.', columns: [['interestDate', 'Date'], ['loanId', 'Loan'], ['periodNumber', 'Period'], ['openingBalance', 'Opening', 'money'], ['interestAmount', 'Interest', 'money'], ['closingBalance', 'Closing', 'money']] },
    transactions: { title: 'Transactions', method: 'getTransactions', description: 'Financial transaction history and audit reference.', columns: [['transactionDate', 'Date'], ['transactionType', 'Type'], ['loanId', 'Loan'], ['amount', 'Amount', 'money'], ['direction', 'Direction'], ['description', 'Description']] },
    reports: { title: 'Reports', method: 'getDashboardData', description: 'Current portfolio totals from the live data source.', columns: [['label', 'Measure'], ['value', 'Value']] },
    audit: { title: 'Audit log', method: 'getAuditLog', description: 'System activity and financial record history.', columns: [['timestamp', 'Date'], ['action', 'Action'], ['user', 'User'], ['sheetName', 'Sheet'], ['recordId', 'Record'], ['description', 'Description']] },
    settings: { title: 'Settings', method: 'getSystemSettings', description: 'Configuration values used by the lending system.', columns: [['label', 'Setting'], ['value', 'Value']] }
  };

  const money = (value) => {
    if (value === null || value === undefined || value === '') return '--';
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: 'MWK', maximumFractionDigits: 2
    }).format(Number(value) || 0);
  };

  function setConnection(connected) {
    document.getElementById('connection-label').textContent = connected ? 'Connected' : 'API unavailable';
    document.querySelector('.status-dot').style.background = connected ? '#78c9a6' : '#d89032';
    document.getElementById('connection-notice').hidden = connected;
  }

  function renderDashboard(data) {
    state.dashboard = data || {};
    document.querySelectorAll('[data-metric]').forEach((element) => {
      const key = element.dataset.metric;
      const value = state.dashboard[key];
      const monetary = ['balance', 'disbursed', 'charged', 'received', 'collections', 'promises'].some((term) => key.toLowerCase().includes(term));
      element.textContent = monetary ? money(value) : (value ?? '--');
    });
    document.getElementById('last-updated').textContent = data.lastUpdated ? `Updated ${displayValue(data.lastUpdated, 'date')}` : 'Live data';
  }

  async function loadDashboard() {
    const requestId = ++state.dashboardRequest;
    const response = await fetch(`/api/proxy?method=getDashboardData&_=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false) throw new Error(payload.error || 'Dashboard request failed.');
    if (requestId !== state.dashboardRequest) return;
    const dashboard = payload.data || payload;
    renderDashboard(dashboard);
    const [loans, collections, payments] = await Promise.all([request('getLoans'), request('getCollections'), request('getPayments')]);
    if (requestId !== state.dashboardRequest) return;
    renderAttention(collections, loans);
    renderActivity(payments);
    setConnection(true);
  }

  function renderAttention(collections, loans) {
    const list = document.getElementById('attention-list');
    const items = (collections || []).slice().sort((a, b) => new Date(a.promiseToPayDate || a.collectionDate) - new Date(b.promiseToPayDate || b.collectionDate)).slice(0, 3);
    if (!items.length && !(loans || []).some((loan) => Number(loan.daysOverdue) > 0)) {
      list.innerHTML = '<div class="empty-state"><strong>Portfolio is on track</strong><span>No overdue collections require attention.</span></div>';
      return;
    }
    list.innerHTML = items.map((item) => `<div class="attention-row"><span class="attention-icon">!</span><div><strong>${item.customerName || item.loanId}</strong><small>${item.collectionStatus || 'Collection'} · ${displayValue(item.promiseToPayDate || item.collectionDate, 'date')}</small></div><b>${money(item.amountPromised)}</b></div>`).join('');
  }

  function renderActivity(payments) {
    const list = document.getElementById('activity-list');
    const items = (payments || []).slice().sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 4);
    list.innerHTML = items.length ? items.map((item) => `<div class="activity-row"><span class="activity-icon">↓</span><div><strong>${item.customerName || item.loanId}</strong><small>${item.paymentMethod || 'Payment'} · ${displayValue(item.paymentDate, 'date')}</small></div><b>${money(item.amount)}</b></div>`).join('') : '<div class="empty-state"><strong>No payments recorded</strong><span>New payment activity will appear here.</span></div>';
  }

  async function request(method, args = []) {
    const writing = args.length > 0;
    const response = await fetch(`/api/proxy?method=${method}&_=${Date.now()}`, {
      method: writing ? 'POST' : 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: writing ? JSON.stringify({ args }) : undefined
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false) throw new Error(payload.error || 'Request failed.');
    return payload.data ?? payload;
  }

  const displayValue = (value, format) => {
    if (value === null || value === undefined || value === '') return '--';
    if (format === 'money') return money(value);
    if (format === 'date') return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
    return String(value);
  };

  function normaliseRows(page, data) {
    if (page === 'settings') return Object.entries(data || {}).map(([label, value]) => ({ label, value }));
    if (page === 'reports') return Object.entries(data || {}).map(([label, value]) => ({ label, value }));
    return Array.isArray(data) ? data : [];
  }

  function renderRows(rows, columns) {
    state.rows = rows;
    state.columns = columns;
    document.getElementById('module-head').innerHTML = `<tr>${columns.map((column) => `<th>${column[1]}</th>`).join('')}</tr>`;
    const query = document.getElementById('module-search').value.trim().toLowerCase();
    const filtered = rows.filter((row) => !query || columns.some(([key]) => String(row[key] ?? '').toLowerCase().includes(query)));
    document.getElementById('record-count').textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'}`;
    document.getElementById('module-body').innerHTML = filtered.length
      ? filtered.map((row) => `<tr>${columns.map(([key, label, format]) => `<td>${displayValue(row[key], format)}</td>`).join('')}</tr>`).join('')
      : `<tr><td class="table-empty" colspan="${columns.length}">No records found.</td></tr>`;
  }

  function showModuleStatus(message) {
    const element = document.getElementById('module-status');
    element.textContent = message;
    element.hidden = !message;
  }

  async function loadModule(page) {
    const config = pages[page];
    const requestId = ++state.moduleRequest;
    document.getElementById('module-eyebrow').textContent = page === 'ledger' ? 'INTEREST LEDGER' : page.toUpperCase();
    document.getElementById('module-title').textContent = config.title;
    document.getElementById('module-description').textContent = config.description;
    document.getElementById('module-actions').innerHTML = ['payments', 'collections', 'settings'].includes(page)
      ? `<button class="action-button primary" data-open-form="${page === 'payments' ? 'payment' : page === 'collections' ? 'collection' : 'settings'}">${page === 'settings' ? 'Edit settings' : `+ ${page === 'payments' ? 'Payment' : 'Collection'}`}</button>`
      : '';
    document.getElementById('module-search').value = '';
    showModuleStatus('Loading live records...');
    document.getElementById('record-count').textContent = '';
    document.getElementById('module-body').innerHTML = '';
    try {
      const data = await request(config.method);
      if (requestId !== state.moduleRequest) return;
      renderRows(normaliseRows(page, data), config.columns);
      showModuleStatus('');
      setConnection(true);
    } catch (error) {
      if (requestId !== state.moduleRequest) return;
      showModuleStatus(error.message);
      document.getElementById('record-count').textContent = '';
      setConnection(false);
    }
  }

  function navigate(page) {
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.page === page));
    const dashboard = page === 'dashboard';
    document.getElementById('page-dashboard').classList.toggle('active', dashboard);
    document.getElementById('page-module').classList.toggle('active', !dashboard);
    document.getElementById('page-dashboard').hidden = !dashboard;
    document.getElementById('page-module').hidden = dashboard;
    document.getElementById('page-title').textContent = pages[page].title;
    document.getElementById('sidebar').classList.remove('open');
    if (!dashboard) loadModule(page);
  }

  const formDefinitions = {
    customer: {
      title: 'New customer', method: 'createCustomerFromWebApp', fields: [
        ['name', 'Full name', 'text', true], ['phone', 'Phone number', 'text', true], ['alternativePhone', 'Alternative phone', 'text'],
        ['address', 'Address', 'text'], ['idReference', 'ID / reference', 'text'], ['occupationBusiness', 'Occupation / business', 'text'], ['notes', 'Notes', 'textarea']
      ]
    },
    loan: {
      title: 'New loan', method: 'createLoanFromWebApp', fields: [
        ['customerId', 'Customer ID', 'text', true], ['principal', 'Principal (MWK)', 'number', true], ['interestRate', 'Interest rate', 'number'],
        ['termDays', 'Term (days)', 'number'], ['loanPurpose', 'Loan purpose', 'text'], ['disbursementMethod', 'Disbursement method', 'text'], ['notes', 'Notes', 'textarea']
      ]
    },
    payment: {
      title: 'Record payment', method: 'recordPaymentFromWebApp', fields: [
        ['loanId', 'Loan ID', 'text', true], ['amount', 'Amount (MWK)', 'number', true], ['paymentMethod', 'Payment method', 'text'], ['reference', 'Reference', 'text'], ['notes', 'Notes', 'textarea']
      ]
    },
    collection: {
      title: 'Record collection', method: 'recordCollectionFromWebApp', fields: [
        ['loanId', 'Loan ID', 'text', true], ['promiseToPayDate', 'Promise date', 'date'], ['amountPromised', 'Amount promised (MWK)', 'number'], ['amountReceived', 'Amount received (MWK)', 'number'], ['contactMethod', 'Contact method', 'text'], ['collectionStatus', 'Status', 'text'], ['notes', 'Notes', 'textarea']
      ]
    },
    settings: {
      title: 'Edit settings', method: 'updateSystemSettings', fields: []
    }
  };

  function openForm(type) {
    const definition = formDefinitions[type];
    if (!definition) return;
    if (type === 'settings') {
      definition.fields = state.rows.map((row) => [`setting_${row.label}`, row.label, 'text']);
    }
    state.activeForm = type;
    document.getElementById('entry-title').textContent = definition.title;
    document.getElementById('entry-status').hidden = true;
    document.getElementById('entry-form').innerHTML = definition.fields.map(([name, label, inputType, required]) => `<label class="form-field"><span>${label}${required ? ' *' : ''}</span>${inputType === 'textarea' ? `<textarea name="${name}" rows="3" ${required ? 'required' : ''}></textarea>` : `<input name="${name}" type="${inputType}" ${required ? 'required' : ''}>`}</label>`).join('');
    if (type === 'settings') state.rows.forEach((row) => { const input = document.querySelector(`[name="setting_${CSS.escape(row.label)}"]`); if (input) input.value = row.value ?? ''; });
    document.getElementById('entry-modal').hidden = false;
  }

  function closeForm() {
    document.getElementById('entry-modal').hidden = true;
    document.getElementById('entry-form').reset();
    state.activeForm = null;
  }

  async function submitForm(event) {
    event.preventDefault();
    const definition = formDefinitions[state.activeForm];
    if (!definition) return;
    const formType = state.activeForm;
    const button = document.getElementById('save-entry');
    const status = document.getElementById('entry-status');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (formType === 'settings') {
      data.settings = {};
      Object.entries(data).forEach(([key, value]) => { if (key.startsWith('setting_')) data.settings[key.slice(8)] = value; });
    }
    button.disabled = true;
    status.textContent = 'Saving record...';
    status.hidden = false;
    try {
      await request(definition.method, [data]);
      closeForm();
      setConnection(true);
      if (formType === 'customer' || formType === 'loan') await loadDashboard();
      const activePage = document.querySelector('.nav-link.active')?.dataset.page;
      if (activePage && activePage !== 'dashboard' && pages[activePage].method) await loadModule(activePage);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => navigate(link.dataset.page)));
  document.addEventListener('click', (event) => {
    const pageLink = event.target.closest('[data-page-link]');
    if (pageLink) navigate(pageLink.dataset.pageLink);
  });
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-form]');
    if (trigger) openForm(trigger.dataset.openForm);
  });
  document.getElementById('entry-form').addEventListener('submit', submitForm);
  document.getElementById('close-entry').addEventListener('click', closeForm);
  document.getElementById('cancel-entry').addEventListener('click', closeForm);
  document.getElementById('module-search').addEventListener('input', () => renderRows(state.rows, state.columns));
  document.getElementById('refresh-button').addEventListener('click', () => loadDashboard().catch(() => setConnection(false)));
  document.getElementById('menu-button').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('today-label').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());
  loadDashboard().catch(() => setConnection(false));
})();
