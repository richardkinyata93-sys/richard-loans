(() => {
  const state = { dashboard: null };
  const pages = {
    dashboard: 'Portfolio overview',
    customers: 'Customers',
    loans: 'Loans',
    payments: 'Payments',
    collections: 'Collections',
    ledger: 'Interest ledger',
    reports: 'Reports',
    settings: 'Settings'
  };

  const money = (value) => {
    if (value === null || value === undefined || value === '') return '--';
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: 'MWK', maximumFractionDigits: 2
    }).format(Number(value) || 0);
  };

  function setConnection(connected) {
    document.getElementById('connection-label').textContent = connected ? 'Connected' : 'API not configured';
    document.querySelector('.status-dot').style.background = connected ? '#78c9a6' : '#d89032';
    document.getElementById('connection-notice').hidden = connected;
  }

  function renderDashboard(data) {
    state.dashboard = data || {};
    document.querySelectorAll('[data-metric]').forEach((element) => {
      const key = element.dataset.metric;
      const value = state.dashboard[key];
      element.textContent = key.toLowerCase().includes('balance') || key.toLowerCase().includes('disbursed') || key.toLowerCase().includes('charged') || key.toLowerCase().includes('received') || key.toLowerCase().includes('collections') ? money(value) : (value ?? '--');
    });
  }

  async function loadDashboard() {
    const response = await fetch(`/api/proxy?method=getDashboardData&_=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false) throw new Error(payload.error || 'Dashboard request failed.');
    renderDashboard(payload.data || payload);
    setConnection(true);
  }

  function navigate(page) {
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.page === page));
    document.getElementById('page-dashboard').classList.toggle('active', page === 'dashboard');
    document.getElementById('page-placeholder').classList.toggle('active', page !== 'dashboard');
    document.getElementById('page-title').textContent = pages[page] || pages.dashboard;
    if (page !== 'dashboard') document.getElementById('placeholder-title').textContent = pages[page] || 'Module';
  }

  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => navigate(link.dataset.page)));
  document.getElementById('refresh-button').addEventListener('click', () => loadDashboard().catch(() => setConnection(false)));
  document.getElementById('menu-button').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('today-label').textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());
  loadDashboard().catch(() => setConnection(false));
})();
