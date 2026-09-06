export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const endpoint = process.env.APPS_SCRIPT_WEB_APP_URL;
  const allowedMethods = new Set([
    'getDashboardData',
    'getSystemInfo',
    'getSystemHealth',
    'getCustomers',
    'getLoans',
    'getPayments',
    'getCollections',
    'getInterest',
    'getTransactions',
    'getReports',
    'getAuditLog',
    'getSystemSettings',
    'getWebAppAutomationStatus',
    'createCustomerFromWebApp',
    'createLoanFromWebApp',
    'recordPaymentFromWebApp',
    'recordCollectionFromWebApp'
  ]);

  if (!endpoint) {
    response.status(503).json({
      success: false,
      error: 'Apps Script API is not configured for this deployment.'
    });
    return;
  }

  let endpointUrl;

  try {
    endpointUrl = new URL(endpoint);
  } catch (error) {
    response.status(503).json({
      success: false,
      error: 'Apps Script API URL is invalid.'
    });
    return;
  }

  if (endpointUrl.protocol !== 'https:') {
    response.status(503).json({
      success: false,
      error: 'Apps Script API URL must use HTTPS.'
    });
    return;
  }

  const method = String(request.query.method || '').trim();

  if (!allowedMethods.has(method)) {
    response.status(400).json({
      success: false,
      error: 'API method is not available.'
    });
    return;
  }

  const args = request.method === 'POST' && request.body
    ? request.body.args || []
    : [];

  try {
    const upstream = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        method,
        args
      }),
      signal: AbortSignal.timeout(10000)
    });

    const text = await upstream.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      data = {
        success: false,
        error: `Apps Script returned a non-JSON response (HTTP ${upstream.status}).`
      };
    }

    response.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (error) {
    response.status(502).json({
      success: false,
      error: 'Unable to reach the Apps Script API.'
    });
  }
}
