# Project Rules

## Platforms

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-style primitives, dnd-kit, Zustand, Axios, React Router DOM.
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Pydantic.
- Deployment targets: Vercel for the frontend, Render for the backend, Neon PostgreSQL for production data.
- Local Python runtime: Python 3.11.5.

## Environment

- Backend virtual environment lives at `backend/.venv`.
- Create it with `py -3.11 -m venv backend/.venv` on Windows.
- Install backend dependencies with `backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt`.
- Keep `.env` files local and never commit secrets.

## Code Instructions

- Keep frontend and backend code in separate top-level folders: `frontend/` and `backend/`.
- Use typed API boundaries: Pydantic schemas on the backend and TypeScript interfaces on the frontend.
- Send the active simulated user as `X-USER-ID` from the frontend.
- Persist ordering through numeric `position` columns.
- Use optimistic UI updates for drag/drop and fast board interactions.
- Keep components compact, reusable, and aligned with the existing design language.
- Prefer readable service functions over embedding business rules directly in route handlers.
- Run the relevant build or smoke check before committing meaningful changes.
