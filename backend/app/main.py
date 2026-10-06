from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.projects import experiments_router, router as projects_router
from app.core.config import settings
from app.core.database import init_db


def startup():
    init_db()
    try:
        from app.models import User
        from app.core.database import SessionLocal
        from app.core.security import hash_password
        db = SessionLocal()
        try:
            demo_user = db.query(User).filter(User.email == settings.demo_email).first()
            if not demo_user:
                db.add(User(name="Demo User", email=settings.demo_email, password_hash=hash_password(settings.demo_password)))
                db.commit()
            else:
                demo_user.password_hash = hash_password(settings.demo_password)
                db.commit()
        finally:
            db.close()
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup()
    yield


app = FastAPI(
    title="Rankace API",
    version="1.0.0",
    description="AI-powered SEO growth & search visibility platform. Estimates opportunities; does not reproduce Google's proprietary ranking algorithm.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(experiments_router, prefix=settings.api_prefix)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


@app.get(f"{settings.api_prefix}/demo")
@app.get("/demo")
def demo_data():
    from app.services.demo import demo_dashboard
    return demo_dashboard()
