from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class BarrierCategory(str, Enum):
    STAIRS_OR_STEPS = "STAIRS_OR_STEPS"
    MISSING_KERB_RAMP = "MISSING_KERB_RAMP"
    BROKEN_UNEVEN_SURFACE = "BROKEN_UNEVEN_SURFACE"
    POLE_OR_OBSTRUCTION = "POLE_OR_OBSTRUCTION"
    PARKED_VEHICLE_BLOCKING_PATH = "PARKED_VEHICLE_BLOCKING_PATH"
    NARROW_PASSAGE = "NARROW_PASSAGE"
    CONSTRUCTION_WORK = "CONSTRUCTION_WORK"
    STEEP_INCLINE = "STEEP_INCLINE"

class BarrierSeverity(str, Enum):
    LOW = "LOW"           # Minor inconvenience (e.g. slight bump)
    MODERATE = "MODERATE" # Passable with assistance or caution
    HIGH = "HIGH"         # Impassable for manual wheelchair
    CRITICAL = "CRITICAL" # Completely impassable (e.g. flight of stairs, deep pit)

class BarrierStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    REPORTED_PENDING = "REPORTED_PENDING"
    RESOLVED = "RESOLVED"

class Barrier(BaseModel):
    id: str
    category: BarrierCategory
    severity: BarrierSeverity
    description: str
    lat: float
    lon: float
    segment_id: Optional[str] = None
    status: BarrierStatus = BarrierStatus.CONFIRMED
    detected_by: str = "VisionScan AI"
    confidence: float = 0.88
    image_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified_at: Optional[str] = None

class SurfaceCondition(str, Enum):
    SMOOTH_CONCRETE = "SMOOTH_CONCRETE"
    ASPHALT = "ASPHALT"
    PAVERS = "PAVERS"
    COBBLESTONE = "COBBLESTONE"
    GRAVEL = "GRAVEL"
    DAMAGED_CRACKED = "DAMAGED_CRACKED"

class SegmentStatus(str, Enum):
    VERIFIED_PASSABLE = "VERIFIED_PASSABLE"
    KNOWN_BARRIER = "KNOWN_BARRIER"
    UNKNOWN = "UNKNOWN"

class FootpathSegment(BaseModel):
    id: str
    name: str
    start_node: str
    end_node: str
    coordinates: List[List[float]]  # List of [lat, lon]
    length_m: float
    surface: SurfaceCondition
    clear_width_m: float
    slope_pct: float
    has_kerb_ramp: bool
    status: SegmentStatus
    barriers: List[Barrier] = []
    evidence_source: str = "Street-level VisionScan + Field Audit"
    last_inspected: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verification_confidence: float = 0.95

class MobilityProfileId(str, Enum):
    STANDARD_WHEELCHAIR = "STANDARD_WHEELCHAIR"
    POWER_WHEELCHAIR = "POWER_WHEELCHAIR"
    WALKING_FRAME = "WALKING_FRAME"
    STROLLER = "STROLLER"
    CUSTOM = "CUSTOM"

class MobilityProfile(BaseModel):
    profile_id: MobilityProfileId = MobilityProfileId.STANDARD_WHEELCHAIR
    name: str = "Manual Wheelchair"
    min_clear_width_m: float = 0.9
    max_slope_pct: float = 6.0
    require_kerb_ramps: bool = True
    avoid_stairs: bool = True
    avoid_cobblestone: bool = True
    description: str = "Standard adult manual wheelchair requiring curb ramps and modest gradients"

class RouteRequest(BaseModel):
    origin: List[float] = Field(..., description="[lat, lon]")
    destination: List[float] = Field(..., description="[lat, lon]")
    profile: MobilityProfile = Field(default_factory=MobilityProfile)

class JourneyProofStatus(str, Enum):
    FEASIBLE_WITH_AVAILABLE_EVIDENCE = "FEASIBLE_WITH_AVAILABLE_EVIDENCE"
    BLOCKED = "BLOCKED"
    NEEDS_VERIFICATION = "NEEDS_VERIFICATION"

class JourneyProofStep(BaseModel):
    segment_id: str
    name: str
    length_m: float
    surface: SurfaceCondition
    clear_width_m: float
    slope_pct: float
    has_kerb_ramp: bool
    status: SegmentStatus
    barriers_encountered: List[str] = []
    evidence_note: str

class JourneyProof(BaseModel):
    overall_status: JourneyProofStatus
    total_distance_m: float
    estimated_time_min: float
    feasibility_score: int # 0-100%
    verified_passable_distance_m: float
    unknown_distance_m: float
    blocked_distance_m: float
    key_evidence: List[str]
    barriers_avoided: List[str]
    unverified_warnings: List[str]
    why_alternative_chosen: Optional[str] = None
    steps: List[JourneyProofStep]
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RouteOption(BaseModel):
    route_id: str
    name: str
    is_accessible: bool
    distance_m: float
    estimated_time_min: float
    status: JourneyProofStatus
    coordinates: List[List[float]]
    segments: List[FootpathSegment]
    barriers: List[Barrier]
    journey_proof: JourneyProof

class RouteResponse(BaseModel):
    success: bool
    origin: List[float]
    destination: List[float]
    profile_applied: MobilityProfile
    recommended_route: Optional[RouteOption] = None
    comparison_route: Optional[RouteOption] = None
    all_routes: List[RouteOption] = []
    message: str

class RealityPulseReportCreate(BaseModel):
    category: BarrierCategory
    severity: BarrierSeverity = BarrierSeverity.HIGH
    lat: float
    lon: float
    segment_id: Optional[str] = None
    description: str
    image_url: Optional[str] = None

class RealityPulseReport(BaseModel):
    id: str
    category: BarrierCategory
    severity: BarrierSeverity
    lat: float
    lon: float
    segment_id: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    status: str = "PENDING_VERIFICATION"  # PENDING_VERIFICATION, VERIFIED, REJECTED
    reported_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified_at: Optional[str] = None
    verified_by: Optional[str] = None

class AccessImpactItem(BaseModel):
    barrier_id: str
    segment_id: Optional[str]
    category: BarrierCategory
    severity: BarrierSeverity
    location_name: str
    lat: float
    lon: float
    affected_routes_count: int
    accessibility_detour_penalty_m: float
    priority_score: float # 0 - 100
    recommended_fix: str
    estimated_impact_level: str # HIGH, CRITICAL, MODERATE

class AccessImpactSummary(BaseModel):
    total_barriers_tracked: int
    critical_blockers_count: int
    pending_reports_count: int
    network_accessibility_pct: float
    priority_interventions: List[AccessImpactItem]
