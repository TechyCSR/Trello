from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.migrations import ensure_runtime_schema
from app.db.seed import seed_database
from app.db.session import Base, SessionLocal, engine
from app.routes import boards, cards, labels, lists, users
from app.utils.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title="Trello Inspired Kanban API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(users.router)
    app.include_router(boards.router)
    app.include_router(lists.router)
    app.include_router(labels.router)
    app.include_router(cards.router)

    @app.on_event("startup")
    def startup() -> None:
        Base.metadata.create_all(bind=engine)
        ensure_runtime_schema(engine)
        if settings.auto_seed:
            db = SessionLocal()
            try:
                seed_database(db)
            finally:
                db.close()

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
