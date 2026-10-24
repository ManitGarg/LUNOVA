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

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from backend.app.api.endpoints import router
except ImportError:
    from app.api.endpoints import router

app = FastAPI(
    title="LUNOVA Accessibility Engine",
    description="AI-powered accessible walking route planner with JourneyProof verification for Smart Cities (SC-02)",
    version="1.0.0",
    redirect_slashes=False
)

# Serverless routing path normalization middleware
@app.middleware("http")
async def normalize_api_routing(request: Request, call_next):
    raw_path = request.scope.get("path", "")

    # 1. If Vercel passed path via query parameter from rewrite
    path_param = request.query_params.get("path")
    if path_param:
        clean_param = path_param.strip("/")
        request.scope["path"] = f"/api/{clean_param}"
        return await call_next(request)

    # 2. Check for entrypoint artifacts in raw path
    for artifact in ["/api/index.py", "/api/index", "/app/main.py", "/app/main"]:
        if raw_path.startswith(artifact):
            cleaned = raw_path[len(artifact):]
            raw_path = cleaned if cleaned else "/"
            break

    # 3. Check for x-matched-path header if available
    if raw_path in ["", "/"]:
        matched = request.headers.get("x-matched-path")
        if matched and not any(matched.startswith(a) for a in ["/api/index", "/app/main"]):
            raw_path = matched

    request.scope["path"] = raw_path
    return await call_next(request)

# CORS configuration: allow deployed Vercel frontend, preview branches, and local development
CORS_ALLOWED_ORIGINS = [
    "https://lunova-kappa.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://lunova-.*\.vercel\.app$",
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

# Primary canonical public route prefix: /api (e.g. /api/health, /api/routes)
app.include_router(router, prefix="/api")

# Direct fallback route without prefix (in case /api is stripped by serverless or proxy)
app.include_router(router)

# Safeguard fallback when /api prefix is doubled (e.g. /api/api/*)
app.include_router(router, prefix="/api/api")

# Expose handler alias for serverless runtime adapters
handler = app

@app.get("/")
@app.get("/api")
@app.get("/api/")
def root():
    return {
        "project": "LUNOVA",
        "team": "ELUNOR",
        "tagline": "Every journey should be possible.",
        "flagship_feature": "JourneyProof",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/docs", include_in_schema=False)
def api_docs_redirect():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
