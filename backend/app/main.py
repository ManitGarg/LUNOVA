import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.api.endpoints import router

app = FastAPI(
    title="LUNOVA Accessibility Engine",
    description="AI-powered accessible walking route planner with JourneyProof verification for Smart Cities (SC-02)",
    version="1.0.0"
)

# CORS setup for Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for photo inspection
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Include API endpoints
app.include_router(router)

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
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
