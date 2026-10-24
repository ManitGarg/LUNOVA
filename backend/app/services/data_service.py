import os
import json
import uuid
import math
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timezone
from backend.app.models.schemas import (
    FootpathSegment, Barrier, RealityPulseReport, RealityPulseReportCreate,
    SegmentStatus, BarrierSeverity, BarrierStatus, BarrierCategory,
    AccessImpactSummary, AccessImpactItem
)

# Root directory is 4 levels up from this file (backend/app/services/data_service.py)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
INITIAL_DATA_FILE = os.path.join(ROOT_DIR, "data", "demo_network.json")
BACKEND_DATA_DIR = os.path.join(ROOT_DIR, "backend", "data")
STORE_FILE = os.path.join(BACKEND_DATA_DIR, "store.json")

class DataService:
    def __init__(self):
        os.makedirs(BACKEND_DATA_DIR, exist_ok=True)
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.segments: Dict[str, FootpathSegment] = {}
        self.reports: Dict[str, RealityPulseReport] = {}
        self.load_data()

    def load_data(self):
        """Loads data from persistent store if present, else seeds from demo_network.json."""
        if os.path.exists(STORE_FILE):
            try:
                with open(STORE_FILE, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                    self.nodes = payload.get("nodes", {})
                    self.segments = {
                        s["id"]: FootpathSegment(**s) for s in payload.get("segments", [])
                    }
                    self.reports = {
                        r["id"]: RealityPulseReport(**r) for r in payload.get("reports", [])
                    }
                    return
            except Exception as e:
                print(f"Failed to load persistent store: {e}. Falling back to demo data.")

        # Seed from initial data
        if os.path.exists(INITIAL_DATA_FILE):
            with open(INITIAL_DATA_FILE, "r", encoding="utf-8") as f:
                payload = json.load(f)
                self.nodes = payload.get("nodes", {})
                self.segments = {
                    s["id"]: FootpathSegment(**s) for s in payload.get("segments", [])
                }
        
        # Add initial sample community reports
        self._seed_initial_reports()
        self.save_data()

    def _seed_initial_reports(self):
        report_1 = RealityPulseReport(
            id="rep_sample_01",
            category=BarrierCategory.POLE_OR_OBSTRUCTION,
            severity=BarrierSeverity.HIGH,
            lat=-37.8171,
            lon=144.9696,
            segment_id="seg_underpass_to_arts_promenade",
            description="Temporary construction scaffolding reducing path to 65cm",
            status="PENDING_VERIFICATION",
            reported_at="2026-10-23T14:20:00Z"
        )
        report_2 = RealityPulseReport(
            id="rep_sample_02",
            category=BarrierCategory.BROKEN_UNEVEN_SURFACE,
            severity=BarrierSeverity.MODERATE,
            lat=-37.8183,
            lon=144.9663,
            segment_id="seg_station_to_river_west",
            description="Sunken pavers causing 4cm trip ledge",
            status="PENDING_VERIFICATION",
            reported_at="2026-10-24T08:10:00Z"
        )
        self.reports[report_1.id] = report_1
        self.reports[report_2.id] = report_2

    def save_data(self):
        """Persists current state to local JSON store."""
        payload = {
            "nodes": self.nodes,
            "segments": [s.model_dump() for s in self.segments.values()],
            "reports": [r.model_dump() for r in self.reports.values()],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    def reset_demo_data(self):
        """Resets the store back to initial clean demo network."""
        if os.path.exists(STORE_FILE):
            os.remove(STORE_FILE)
        self.load_data()

    def get_all_segments(self) -> List[FootpathSegment]:
        return list(self.segments.values())

    def get_segment(self, segment_id: str) -> Optional[FootpathSegment]:
        return self.segments.get(segment_id)

    def get_all_nodes(self) -> Dict[str, Dict[str, Any]]:
        return self.nodes

    def find_nearest_node(self, lat: float, lon: float) -> Optional[str]:
        """Finds closest node in graph to given coordinate."""
        closest_id = None
        min_dist = float("inf")
        for node_id, data in self.nodes.items():
            nlat = data["lat"]
            nlon = data["lon"]
            # approximate euclidean distance for local bounding box
            d = math.hypot(lat - nlat, lon - nlon)
            if d < min_dist:
                min_dist = d
                closest_id = node_id
        return closest_id

    def find_nearest_segment(self, lat: float, lon: float) -> Optional[str]:
        """Finds nearest segment by checking distance to midpoint of coordinates."""
        closest_id = None
        min_dist = float("inf")
        for seg_id, seg in self.segments.items():
            if not seg.coordinates:
                continue
            # calculate average coordinate
            avg_lat = sum(c[0] for c in seg.coordinates) / len(seg.coordinates)
            avg_lon = sum(c[1] for c in seg.coordinates) / len(seg.coordinates)
            d = math.hypot(lat - avg_lat, lon - avg_lon)
            if d < min_dist:
                min_dist = d
                closest_id = seg_id
        return closest_id

    def add_barrier(self, barrier: Barrier) -> Barrier:
        """Associates barrier with segment and updates segment status."""
        if not barrier.segment_id:
            nearest_seg = self.find_nearest_segment(barrier.lat, barrier.lon)
            barrier.segment_id = nearest_seg

        if barrier.segment_id and barrier.segment_id in self.segments:
            seg = self.segments[barrier.segment_id]
            # avoid duplicate barrier id
            existing_ids = [b.id for b in seg.barriers]
            if barrier.id not in existing_ids:
                seg.barriers.append(barrier)
            
            if barrier.status == BarrierStatus.CONFIRMED and barrier.severity in [BarrierSeverity.HIGH, BarrierSeverity.CRITICAL]:
                seg.status = SegmentStatus.KNOWN_BARRIER
            
            self.segments[barrier.segment_id] = seg
        
        self.save_data()
        return barrier

    def create_report(self, report_in: RealityPulseReportCreate) -> RealityPulseReport:
        seg_id = report_in.segment_id or self.find_nearest_segment(report_in.lat, report_in.lon)
        report_id = f"rep_{uuid.uuid4().hex[:8]}"
        report = RealityPulseReport(
            id=report_id,
            category=report_in.category,
            severity=report_in.severity,
            lat=report_in.lat,
            lon=report_in.lon,
            segment_id=seg_id,
            description=report_in.description,
            image_url=report_in.image_url,
            status="PENDING_VERIFICATION",
            reported_at=datetime.now(timezone.utc).isoformat()
        )
        self.reports[report_id] = report
        self.save_data()
        return report

    def get_all_reports(self) -> List[RealityPulseReport]:
        return list(self.reports.values())

    def verify_report(self, report_id: str, verified_by: str = "Civic Verifier") -> Optional[RealityPulseReport]:
        if report_id not in self.reports:
            return None
        report = self.reports[report_id]
        report.status = "VERIFIED"
        report.verified_at = datetime.now(timezone.utc).isoformat()
        report.verified_by = verified_by

        # Create confirmed barrier on associated segment
        barrier = Barrier(
            id=f"bar_{report.id}",
            category=report.category,
            severity=report.severity,
            description=f"Verified Report: {report.description}",
            lat=report.lat,
            lon=report.lon,
            segment_id=report.segment_id,
            status=BarrierStatus.CONFIRMED,
            detected_by=f"RealityPulse Community ({verified_by})",
            confidence=0.98,
            image_url=report.image_url,
            verified_at=report.verified_at
        )
        self.add_barrier(barrier)
        self.save_data()
        return report

    def reject_report(self, report_id: str) -> Optional[RealityPulseReport]:
        if report_id not in self.reports:
            return None
        report = self.reports[report_id]
        report.status = "REJECTED"
        self.save_data()
        return report

    def compute_access_impact(self) -> AccessImpactSummary:
        """Calculates civic impact priorities based on network graph and barrier severity."""
        all_barriers: List[Barrier] = []
        for s in self.segments.values():
            all_barriers.extend(s.barriers)

        critical_count = sum(1 for b in all_barriers if b.severity in [BarrierSeverity.HIGH, BarrierSeverity.CRITICAL] and b.status == BarrierStatus.CONFIRMED)
        pending_reports = sum(1 for r in self.reports.values() if r.status == "PENDING_VERIFICATION")

        total_segs = len(self.segments)
        passable_segs = sum(1 for s in self.segments.values() if s.status == SegmentStatus.VERIFIED_PASSABLE)
        network_pct = round((passable_segs / total_segs * 100) if total_segs else 0, 1)

        # Build prioritized interventions
        interventions: List[AccessImpactItem] = []
        for b in all_barriers:
            if b.status != BarrierStatus.CONFIRMED:
                continue
            seg = self.segments.get(b.segment_id) if b.segment_id else None
            loc_name = seg.name if seg else f"Coord ({b.lat:.4f}, {b.lon:.4f})"

            severity_weight = {
                BarrierSeverity.CRITICAL: 40.0,
                BarrierSeverity.HIGH: 30.0,
                BarrierSeverity.MODERATE: 15.0,
                BarrierSeverity.LOW: 5.0
            }.get(b.severity, 10.0)

            # Detour estimate if route blocked
            detour_penalty = 180.0 if b.severity in [BarrierSeverity.CRITICAL, BarrierSeverity.HIGH] else 45.0
            affected_routes = 3 if b.severity == BarrierSeverity.CRITICAL else (2 if b.severity == BarrierSeverity.HIGH else 1)
            
            priority_score = min(100.0, round(severity_weight + (detour_penalty * 0.15) + (affected_routes * 10.0), 1))

            fix_advice = {
                BarrierCategory.STAIRS_OR_STEPS: "Install compliant 1:14 grade accessibility ramp or platform lift",
                BarrierCategory.MISSING_KERB_RAMP: "Install dropped curb with tactile hazard pavers (TGSI)",
                BarrierCategory.BROKEN_UNEVEN_SURFACE: "Re-level concrete slabs to eliminate lip heights > 6mm",
                BarrierCategory.POLE_OR_OBSTRUCTION: "Relocate utility pole or provide 1.2m clear bypass envelope",
                BarrierCategory.PARKED_VEHICLE_BLOCKING_PATH: "Implement bollard perimeter protection and enforcement",
                BarrierCategory.NARROW_PASSAGE: "Widen effective clear footpath width to minimum 1.2m standard",
            }.get(b.category, "Repair pedestrian surface and restore accessibility envelope")

            interventions.append(
                AccessImpactItem(
                    barrier_id=b.id,
                    segment_id=b.segment_id,
                    category=b.category,
                    severity=b.severity,
                    location_name=loc_name,
                    lat=b.lat,
                    lon=b.lon,
                    affected_routes_count=affected_routes,
                    accessibility_detour_penalty_m=detour_penalty,
                    priority_score=priority_score,
                    recommended_fix=fix_advice,
                    estimated_impact_level="CRITICAL" if priority_score > 70 else ("HIGH" if priority_score > 40 else "MODERATE")
                )
            )

        interventions.sort(key=lambda x: x.priority_score, reverse=True)

        return AccessImpactSummary(
            total_barriers_tracked=len(all_barriers),
            critical_blockers_count=critical_count,
            pending_reports_count=pending_reports,
            network_accessibility_pct=network_pct,
            priority_interventions=interventions
        )

# Global singleton
data_service = DataService()
