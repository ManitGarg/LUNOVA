import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.schemas import BarrierCategory, BarrierSeverity
from backend.app.services.data_service import data_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_test_data():
    """Reset data before each test for determinism."""
    data_service.reset_demo_data()

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["team"] == "ELUNOR"
    assert data["tagline"] == "Every journey should be possible."
    assert data["segments_loaded"] > 0

def test_get_segments():
    response = client.get("/api/segments")
    assert response.status_code == 200
    segments = response.json()
    assert len(segments) >= 7
    # Check that stairs segment has a confirmed barrier
    stairs_seg = next((s for s in segments if s["id"] == "seg_crosswalk_to_heritage_steps"), None)
    assert stairs_seg is not None
    assert stairs_seg["status"] == "KNOWN_BARRIER"
    assert any(b["category"] == "STAIRS_OR_STEPS" for b in stairs_seg["barriers"])

def test_routing_wheelchair_excludes_stairs():
    # Route from Central Station (-37.8178, 144.9671) to Civic Square (-37.8152, 144.9685)
    payload = {
        "origin": [-37.8178, 144.9671],
        "destination": [-37.8152, 144.9685],
        "profile": {
            "profile_id": "STANDARD_WHEELCHAIR",
            "name": "Manual Wheelchair",
            "min_clear_width_m": 0.9,
            "max_slope_pct": 6.0,
            "require_kerb_ramps": True,
            "avoid_stairs": True
        }
    }
    response = client.post("/api/routes", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    
    # 1. Recommended route must be accessible
    rec = res["recommended_route"]
    assert rec is not None
    assert rec["is_accessible"] is True
    assert rec["status"] == "FEASIBLE_WITH_AVAILABLE_EVIDENCE"
    
    # Check that the stairs segment is NOT in the recommended accessible route
    seg_ids = [s["id"] for s in rec["segments"]]
    assert "seg_crosswalk_to_heritage_steps" not in seg_ids
    # But the accessible underpass/arts concourse is used
    assert "seg_station_to_underpass_ramp" in seg_ids
    
    # 2. Check JourneyProof
    proof = rec["journey_proof"]
    assert proof["overall_status"] == "FEASIBLE_WITH_AVAILABLE_EVIDENCE"
    assert proof["feasibility_score"] == 100
    assert len(proof["steps"]) > 0
    assert proof["why_alternative_chosen"] is not None
    
    # 3. Check comparison route (shortest ordinary walking path)
    comp = res["comparison_route"]
    assert comp is not None
    assert comp["is_accessible"] is False
    comp_segs = [s["id"] for s in comp["segments"]]
    assert "seg_crosswalk_to_heritage_steps" in comp_segs

def test_reality_pulse_reporting_and_verification_cycle():
    # 1. Create a barrier report on the accessible path
    report_payload = {
        "category": "POLE_OR_OBSTRUCTION",
        "severity": "HIGH",
        "lat": -37.8175,
        "lon": 144.9695,
        "segment_id": "seg_station_to_underpass_ramp",
        "description": "Heavy delivery crates completely blocking wheelchair ramp"
    }
    create_res = client.post("/api/reports", json=report_payload)
    assert create_res.status_code == 200
    report_data = create_res.json()
    assert report_data["status"] == "PENDING_VERIFICATION"
    rep_id = report_data["id"]

    # At this point, before verification, the segment should still be passable
    seg_before = data_service.get_segment("seg_station_to_underpass_ramp")
    assert seg_before.status == "VERIFIED_PASSABLE"

    # 2. Verify the report
    verify_res = client.post(f"/api/reports/{rep_id}/verify?verifier_name=CivicAuditor")
    assert verify_res.status_code == 200
    verified_data = verify_res.json()
    assert verified_data["status"] == "VERIFIED"
    assert verified_data["verified_by"] == "CivicAuditor"

    # Now the segment must be marked KNOWN_BARRIER
    seg_after = data_service.get_segment("seg_station_to_underpass_ramp")
    assert seg_after.status == "KNOWN_BARRIER"
    assert any("crates" in b.description for b in seg_after.barriers)

def test_access_impact_dashboard():
    response = client.get("/api/impact")
    assert response.status_code == 200
    impact = response.json()
    assert impact["total_barriers_tracked"] >= 2
    assert impact["critical_blockers_count"] >= 1
    assert len(impact["priority_interventions"]) > 0
    # The top priority should be the critical stairs barrier
    top = impact["priority_interventions"][0]
    assert top["severity"] in ["CRITICAL", "HIGH"]
    assert top["priority_score"] > 60

def test_vision_scan_sample_fixtures():
    response = client.get("/api/samples")
    assert response.status_code == 200
    fixtures = response.json()
    assert "sample_stairs" in fixtures
    assert fixtures["sample_stairs"]["category"] == "STAIRS_OR_STEPS"
    assert fixtures["sample_stairs"]["severity"] == "CRITICAL"
