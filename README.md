# Procurement Discipline App

Scaffolded project structure and placeholders.

Getting started (client):

1. Install dependencies in `client`:

```powershell
cd client
npm install
npm run dev
```

2. Start server (separate terminal):

```powershell
node server/index.js
```

Notes:
- The client uses Vite + React. Install `git` and `npm` if missing.
- API endpoints live under `/api/*` on the server.

Server install:

```powershell
cd C:\Users\SERVERPT-260424\Dev\joldan_systems\procurement-discipline-app
npm install
node server/index.js
```

PowerShell notes for testing API (curl alias):

- Windows PowerShell aliases `curl` to `Invoke-WebRequest`. To POST JSON use `Invoke-RestMethod` with a headers hashtable:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/rfqs -Method POST -ContentType 'application/json' -Body '{"title":"Test RFQ"}'
```

- Or call the real curl (if installed) as `curl.exe`:

```powershell
curl.exe -X POST http://localhost:3000/api/rfqs -H "Content-Type: application/json" -d '{"title":"Test RFQ"}'
```

