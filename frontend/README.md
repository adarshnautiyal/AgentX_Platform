# AgentX Frontend

A calm, dark, ambient React dashboard for your existing AgentX FastAPI + Ollama backend.

## Requirements
- Windows 10/11
- Node.js 18+ (20 LTS recommended)
- Your existing Python virtual environment and FastAPI backend
- Ollama with `llama3:latest`

## Start AgentX

### Terminal 1 — backend
From your existing `AgentX` folder:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app:app --reload
```

Keep this terminal open.

### Terminal 2 — frontend
Extract this frontend folder into your existing AgentX folder, so the structure becomes:

```text
AgentX/
├── .venv/
├── app.py
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
```

Open a second PowerShell terminal:

```powershell
cd C:\Users\Adarsh\OneDrive\Desktop\AgentX\frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite, normally:

http://127.0.0.1:5173

Do not open port 8000 expecting the dashboard. Port 8000 is the API; port 5173 is the development UI.

## Current functionality
- Overview dashboard and API/Ollama health indicator
- Chat interface connected to `POST /chat`
- Workflow plan generator connected to `POST /plan`
- Specialist role directory
- Session activity log
- Local connection settings

The four specialist roles are currently planning roles defined in your existing backend. This UI does not claim they are autonomous background workers or that generated plans are executed. Execution, persistent task storage, tool permissions, and real agent hand-offs are later backend milestones.

## Notes
- The Vite development server proxies `/api/*` requests to `http://127.0.0.1:8000`, so no CORS change is needed in the existing `app.py`.
- Keep your existing `app.py` unchanged for this frontend setup.
- If PowerShell blocks `npm`, install Node.js LTS and reopen the terminal.
