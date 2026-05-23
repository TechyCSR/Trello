# Flowboard: Trello-Inspired Kanban

Flowboard is a polished Kanban project management app built for an SDE Intern assignment. It supports multiple boards, public/private visibility, seeded multi-user collaboration simulation, lists, cards, card details, search/filtering, and smooth dnd-kit drag-and-drop.

## Architecture

```text
frontend/  React + Vite + TypeScript + Tailwind + shadcn-style UI
backend/   FastAPI + SQLAlchemy + Pydantic + PostgreSQL-ready data model
```

The frontend keeps fast UI state in Zustand and talks to FastAPI through Axios. The backend uses SQLAlchemy relationships with position columns for list/card ordering and validates access through the simulated `X-USER-ID` header.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui-style primitives, dnd-kit, Zustand, Axios, React Router DOM.
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Pydantic.
- Deployment targets: Vercel frontend, Render backend, Neon PostgreSQL database.
- Python: 3.11.5 with `backend/.venv`.

## Pages

- `/` Home page with modern branding and CTA.
- `/boards` fast board dashboard with create/delete/search/filter.
- `/boards/:boardId` Trello-style workspace with inbox sidebar, horizontal lists, card modal, members, labels, due-date filters, and drag/drop.

## Local Setup

### Backend

```powershell
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Set `DATABASE_URL` in `backend/.env`. For Neon/Render, use a PostgreSQL URL:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
CORS_ORIGINS=http://localhost:5173
```

Run the API:

```powershell
$env:PYTHONPATH="backend"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Optional `.env` for frontend:

```text
VITE_API_URL=http://localhost:8000
```

## Seed Data

On startup, the backend seeds 10 users:

`TechyCSR`, `Alex`, `Sarah`, `John`, `Emma`, `Liam`, `Sophia`, `Noah`, `Olivia`, `Ethan`.

It also creates sample boards, lists, cards, labels, card members, and checklist items.

## API Overview

- Boards: `GET /boards`, `POST /boards`, `GET /boards/{id}`, `PATCH /boards/{id}`, `DELETE /boards/{id}`
- Lists: `POST /lists`, `PATCH /lists/{id}`, `DELETE /lists/{id}`, `PATCH /lists/reorder`
- Labels: `POST /labels`
- Cards: `POST /cards`, `PATCH /cards/{id}`, `DELETE /cards/{id}`, `PATCH /cards/move`, `POST /cards/{id}/comments`
- Search: `GET /cards/search`
- Users: `GET /users`

## Deployment

This repo now includes:

- `frontend/vercel.json` for deploying with `frontend` selected as the Vercel project root.
- `render.yaml` for a Render Blueprint backend service.
- `backend/runtime.txt` to pin Python for Render.

### Vercel

Recommended import path:

- Import the repository into Vercel.
- Set Vercel Root Directory to `frontend`.
- Vercel will use `frontend/vercel.json`.
- Set environment variable:

```text
VITE_API_URL=https://your-render-service.onrender.com
```

### Render

- Create a Render Blueprint from `render.yaml`, or create a Web Service manually.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Required environment variables:

```text
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://your-vercel-production-domain.vercel.app
CORS_ORIGIN_REGEX=^https://.*\.vercel\.app$
AUTO_SEED=true
```

Use `CORS_ORIGINS` for exact production/custom domains and `CORS_ORIGIN_REGEX` for Vercel preview deployments.

### Neon

Create a Neon PostgreSQL database and copy the pooled or direct connection string into Render as `DATABASE_URL`.

## Screenshots

Add screenshots after deployment:

- `docs/screenshots/home.png`
- `docs/screenshots/boards.png`
- `docs/screenshots/workspace.png`
- `docs/screenshots/card-modal.png`

## Assumptions

- No login/signup is implemented by design.
- The current user is selected from the navbar and persisted in `localStorage`.
- `X-USER-ID` is trusted only for this assignment simulation.
- SQLite fallback exists for quick local smoke checks, while production is PostgreSQL.

## Future Improvements

- Add WebSocket-backed live collaboration.
- Add Alembic migrations.
- Add archived card views and activity history.
- Add Playwright end-to-end drag/drop tests.
- Add file attachments and comments.
