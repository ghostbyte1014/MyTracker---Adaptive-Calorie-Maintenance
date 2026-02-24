"""FastAPI Main Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .routers import auth, daily_logs, system_metrics, users, missed_days, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events"""
    # Startup
    print(f"Starting {settings.app_name}")
    yield
    # Shutdown
    print("Shutting down")


app = FastAPI(
    title=settings.app_name,
    description="MyTracker - Adaptive Calorie Maintenance Engine API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(daily_logs.router, prefix="/api")
app.include_router(system_metrics.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(missed_days.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "description": "Adaptive Calorie Maintenance Engine"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
