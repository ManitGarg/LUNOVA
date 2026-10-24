import os
import sys
import types

# Ensure backend directory and repository root are on sys.path
_app_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_app_dir)
_repo_dir = os.path.dirname(_backend_dir)

for _d in [_backend_dir, _repo_dir]:
    if _d and _d not in sys.path:
        sys.path.insert(0, _d)

# Provide compatibility alias for 'backend' module when running with Root Directory = backend
if "backend" not in sys.modules:
    _backend_pkg = types.ModuleType("backend")
    _backend_pkg.__path__ = [_backend_dir]
    sys.modules["backend"] = _backend_pkg

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from backend.app.api.endpoints import router
except ImportError:
    from app.api.endpoints import router

app = FastAPI(
    title="LUNOVA Accessibility Engine",
    description="AI-powered accessible walking route planner with JourneyProof verification for Smart Cities (SC-02)",
    version="1.0.0"
)

# CORS setup for Vite frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for photo inspection if accessible
UPLOADS_DIR = os.path.join(_backend_dir, "uploads")
try:
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
    if os.path.exists(UPLOADS_DIR):
        app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
except (OSError, PermissionError) as e:
    print(f"Notice: Uploads static directory mount skipped on read-only serverless: {e}")

# Include API endpoints
app.include_router(router)

# Expose handler alias for serverless runtime adapters
handler = app

@app.get("/")
def root():
    return {
        "project": "LUNOVA",
        "team": "ELUNOR",
        "tagline": "Every journey should be possible.",
        "flagship_feature": "JourneyProof",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
