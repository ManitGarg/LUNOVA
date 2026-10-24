export type BarrierCategory =
  | 'STAIRS_OR_STEPS'
  | 'MISSING_KERB_RAMP'
  | 'BROKEN_UNEVEN_SURFACE'
  | 'POLE_OR_OBSTRUCTION'
  | 'PARKED_VEHICLE_BLOCKING_PATH'
  | 'NARROW_PASSAGE'
  | 'CONSTRUCTION_WORK'
  | 'STEEP_INCLINE';

export type BarrierSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type BarrierStatus = 'CONFIRMED' | 'REPORTED_PENDING' | 'RESOLVED';
export type SegmentStatus = 'VERIFIED_PASSABLE' | 'KNOWN_BARRIER' | 'UNKNOWN';
export type SurfaceCondition =
  | 'SMOOTH_CONCRETE'
  | 'ASPHALT'
  | 'PAVERS'
  | 'COBBLESTONE'
  | 'GRAVEL'
  | 'DAMAGED_CRACKED';

export type JourneyProofStatus =
  | 'FEASIBLE_WITH_AVAILABLE_EVIDENCE'
  | 'BLOCKED'
  | 'NEEDS_VERIFICATION';

export interface Barrier {
  id: string;
  category: BarrierCategory;
  severity: BarrierSeverity;
  description: string;
  lat: float;
  lon: float;
  segment_id?: string;
  status: BarrierStatus;
  detected_by: string;
  confidence: number;
  image_url?: string;
  created_at: string;
  verified_at?: string;
}

export type float = number;

export interface FootpathSegment {
  id: string;
  name: string;
  start_node: string;
  end_node: string;
  coordinates: [number, number][];
  length_m: number;
  surface: SurfaceCondition;
  clear_width_m: number;
  slope_pct: number;
  has_kerb_ramp: boolean;
  status: SegmentStatus;
  barriers: Barrier[];
  evidence_source: string;
  last_inspected: string;
  verification_confidence: number;
}

export interface MobilityProfile {
  profile_id: string;
  name: string;
  min_clear_width_m: number;
  max_slope_pct: number;
  require_kerb_ramps: boolean;
  avoid_stairs: boolean;
  avoid_cobblestone: boolean;
  description: string;
}

export interface JourneyProofStep {
  segment_id: string;
  name: string;
  length_m: number;
  surface: SurfaceCondition;
  clear_width_m: number;
  slope_pct: number;
  has_kerb_ramp: boolean;
  status: SegmentStatus;
  barriers_encountered: string[];
  evidence_note: string;
}

export interface JourneyProof {
  overall_status: JourneyProofStatus;
  total_distance_m: number;
  estimated_time_min: number;
  feasibility_score: number;
  verified_passable_distance_m: number;
  unknown_distance_m: number;
  blocked_distance_m: number;
  key_evidence: string[];
  barriers_avoided: string[];
  unverified_warnings: string[];
  why_alternative_chosen?: string;
  steps: JourneyProofStep[];
  generated_at: string;
}

export interface RouteOption {
  route_id: string;
  name: string;
  is_accessible: boolean;
  distance_m: number;
  estimated_time_min: number;
  status: JourneyProofStatus;
  coordinates: [number, number][];
  segments: FootpathSegment[];
  barriers: Barrier[];
  journey_proof: JourneyProof;
}

export interface RouteResponse {
  success: boolean;
  origin: [number, number];
  destination: [number, number];
  profile_applied: MobilityProfile;
  recommended_route?: RouteOption;
  comparison_route?: RouteOption;
  all_routes: RouteOption[];
  message: string;
}

export interface RealityPulseReport {
  id: string;
  category: BarrierCategory;
  severity: BarrierSeverity;
  lat: number;
  lon: number;
  segment_id?: string;
  description: string;
  image_url?: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  reported_at: string;
  verified_at?: string;
  verified_by?: string;
}

export interface AccessImpactItem {
  barrier_id: string;
  segment_id?: string;
  category: BarrierCategory;
  severity: BarrierSeverity;
  location_name: string;
  lat: number;
  lon: number;
  affected_routes_count: number;
  accessibility_detour_penalty_m: number;
  priority_score: number;
  recommended_fix: string;
  estimated_impact_level: string;
}

export interface AccessImpactSummary {
  total_barriers_tracked: number;
  critical_blockers_count: number;
  pending_reports_count: number;
  network_accessibility_pct: number;
  priority_interventions: AccessImpactItem[];
}
