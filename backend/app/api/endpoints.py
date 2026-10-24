from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import List, Optional, Dict, Any
from backend.app.models.schemas import (
    FootpathSegment, RouteRequest, RouteResponse,
    RealityPulseReport, RealityPulseReportCreate,
    AccessImpactSummary
)
from backend.app.services.data_service import data_service
from backend.app.services.cv_service import cv_service
from backend.app.routing.graph_engine import routing_engine

router = APIRouter(prefix="/api")

@router.get("/health")
def get_health():
    """Health check endpoint to verify backend status and version."""
    return {
        "status": "healthy",
        "service": "LUNOVA Accessibility Engine",
        "team": "ELUNOR",
        "tagline": "Every journey should be possible.",
        "version": "1.0.0-mvp",
        "segments_loaded": len(data_service.get_all_segments()),
        "reports_tracked": len(data_service.get_all_reports())
    }

@router.get("/segments", response_model=List[FootpathSegment])
def get_segments():
    """Returns all footpath segments with accessibility attributes and confirmed barriers."""
    return data_service.get_all_segments()

@router.get("/nodes")
def get_nodes():
    """Returns all network nodes and key landmarks."""
    return data_service.get_all_nodes()

@router.post("/routes", response_model=RouteResponse)
def calculate_routes(req: RouteRequest):
    """
    Calculates standard shortest route vs constraint-aware accessible route with JourneyProof verification.
    """
    return routing_engine.calculate_routes(req.origin, req.destination, req.profile)

@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    manual_category_hint: Optional[str] = Form(None)
):
    """
    VisionScan endpoint: Analyzes street imagery for accessibility barriers
    (stairs, missing ramps, broken surfaces, obstructions, parked cars, narrow passages).
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    result = cv_service.analyze_uploaded_file(contents, file.filename or "image.jpg", manual_category_hint)
    return result

@router.get("/samples")
def get_sample_fixtures():
    """Returns pre-loaded VisionScan demonstration fixtures for instant 1-click evaluation."""
    return cv_service.get_sample_fixtures()

@router.get("/reports", response_model=List[RealityPulseReport])
def get_reports():
    """Returns all user-submitted RealityPulse barrier reports."""
    return data_service.get_all_reports()

@router.post("/reports", response_model=RealityPulseReport)
def create_report(report_in: RealityPulseReportCreate):
    """Creates a new barrier report in RealityPulse (status: PENDING_VERIFICATION)."""
    return data_service.create_report(report_in)

@router.post("/reports/{report_id}/verify", response_model=RealityPulseReport)
def verify_report(report_id: str, verifier_name: str = Query("Admin Verifier")):
    """
    Verifies a community report. Updates report status to VERIFIED, registers a confirmed
    barrier on the affected segment, and triggers accessibility graph recalculation.
    """
    updated = data_service.verify_report(report_id, verifier_name)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated

@router.post("/reports/{report_id}/reject", response_model=RealityPulseReport)
def reject_report(report_id: str):
    """Marks a report as REJECTED without modifying the accessibility graph."""
    updated = data_service.reject_report(report_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated

@router.get("/impact", response_model=AccessImpactSummary)
def get_access_impact():
    """Returns the AccessImpact civic prioritization dashboard metrics."""
    return data_service.compute_access_impact()

@router.post("/reset-demo")
def reset_demo():
    """Resets the network state and reports to original demo benchmark."""
    data_service.reset_demo_data()
    return {"status": "success", "message": "Demo data reset successfully"}
