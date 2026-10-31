from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import notices, profile, eligibility, calendar, auth, course

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables on startup
    init_db()
    yield

app = FastAPI(
    title="DocuPilot API",
    description="Notice-to-Action Agent for MNNIT Students (Hacktoberfest Hack Day)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(notices.router)
app.include_router(profile.router)
app.include_router(eligibility.router)
app.include_router(calendar.router)
app.include_router(auth.router)
app.include_router(course.router)

@app.get("/")
def home():
    return {
        "message": "Welcome to DocuPilot API",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "DocuPilot Notice-to-Action Agent",
        "gemini_api_configured": bool(settings.GEMINI_API_KEY),
        "google_oauth_configured": bool(settings.GOOGLE_CLIENT_ID)
    }
