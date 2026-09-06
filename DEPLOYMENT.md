# Richard Loans Deployment

## Current architecture

The Apps Script application remains the business and data engine. The Vercel tree is a separate frontend and read-only HTTP boundary. Vercel must not be pointed at a production spreadsheet until the Apps Script deployment and access policy have been reviewed.

## Local validation

```powershell
node --check api/health.js
node --check api/proxy.js
node --check vercel/app.js
```

## Vercel configuration

Set this environment variable in the Vercel project for the appropriate environment:

```text
APPS_SCRIPT_WEB_APP_URL=<development Apps Script web-app URL>
```

Do not commit `.env` files. `.env.example` contains no secret and is safe to track.

## Production readiness

The current Vercel API is anonymous and read-only. Do not expose financial data publicly as a production service until one of these controls is enabled:

- Vercel project access protection for the intended staff users, or
- Application authentication and authorization in front of the proxy.

The Apps Script deployment must use a production spreadsheet only after the data source, backup process, staff access, and audit requirements have been reviewed.

## Deployment order

1. Deploy the Apps Script code to the development deployment only.
2. Verify the development web-app `doPost` endpoint with a read-only method such as `getSystemHealth`.
3. Create or link the Vercel project with the repository root `C:\Richard-Loans`.
4. Configure `APPS_SCRIPT_WEB_APP_URL` in Vercel.
5. Deploy a Preview and verify `/api/health` and `/`.
6. Verify that missing configuration returns a clear `503` instead of fake business data.
7. Configure access protection before exposing the dashboard to production users.
8. Promote to Production only after access, data source, and browser checks are approved.

## API safety

The Apps Script HTTP boundary currently exposes only read methods. Customer, loan, payment, collection, interest-processing, automation, and settings writes remain unavailable through Vercel until authentication, authorization, CSRF protection, and idempotency are implemented. Financial API responses are marked `no-store` so browsers and intermediary caches do not retain them.

The existing Apps Script `google.script.run` frontend remains separate and is not replaced by this deployment.
