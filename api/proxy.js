export default async function handler(request, response) {
  const endpoint = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!endpoint) {
    response.status(503).json({
      success: false,
      error: 'Apps Script API is not configured for this deployment.'
    });
    return;
  }

  const method = String(request.query.method || '').trim();

  if (!method || !/^[A-Za-z][A-Za-z0-9_]*$/.test(method)) {
    response.status(400).json({
      success: false,
      error: 'A valid API method is required.'
    });
    return;
  }

  const args = request.method === 'POST' && request.body
    ? request.body.args || []
    : [];

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        method,
        args
      })
    });

    const text = await upstream.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      data = {
        success: false,
        error: 'Apps Script returned a non-JSON response.'
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
