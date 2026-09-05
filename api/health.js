export default function handler(request, response) {
  response.status(200).json({
    ok: true,
    service: 'richard-loans-vercel',
    appsScriptConfigured: Boolean(process.env.APPS_SCRIPT_WEB_APP_URL)
  });
}
