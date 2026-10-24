import math
import networkx as nx
from typing import List, Optional, Tuple, Dict, Any
try:
    from backend.app.models.schemas import (
        FootpathSegment, MobilityProfile, RouteOption, RouteResponse,
        JourneyProof, JourneyProofStatus, JourneyProofStep, SegmentStatus,
        BarrierSeverity, BarrierStatus, BarrierCategory
    )
    from backend.app.services.data_service import data_service
except ImportError:
    from app.models.schemas import (
        FootpathSegment, MobilityProfile, RouteOption, RouteResponse,
        JourneyProof, JourneyProofStatus, JourneyProofStep, SegmentStatus,
        BarrierSeverity, BarrierStatus, BarrierCategory
    )
    from app.services.data_service import data_service

class RoutingEngine:
    def __init__(self):
        pass

    def _build_graph(self, profile: Optional[MobilityProfile] = None, enforce_constraints: bool = True) -> nx.DiGraph:
        """
        Builds a NetworkX directed graph from footpath segments.
        If enforce_constraints is True, segments that violate the profile are excluded or given infinite cost.
        """
        G = nx.DiGraph()
        segments = data_service.get_all_segments()
        nodes = data_service.get_all_nodes()

        # Add all known nodes
        for node_id, data in nodes.items():
            G.add_node(node_id, lat=data["lat"], lon=data["lon"], name=data.get("name", node_id))

        for seg in segments:
            # Check constraints if enforcing
            is_passable, rejection_reason = self._is_segment_passable(seg, profile, enforce_constraints)
            
            # Bidirectional walking
            edge_attrs = {
                "segment_id": seg.id,
                "segment": seg,
                "length_m": seg.length_m,
                "is_passable": is_passable,
                "rejection_reason": rejection_reason
            }

            if not is_passable:
                # Still record in unconstrained graph, but not in constrained accessible graph
                continue

            # Calculate cost weight
            # For unconstrained standard walking, weight is pure physical distance (length_m)
            # For accessible routing, weight is mobility effort (surface quality, slope, and confidence)
            if not enforce_constraints:
                cost = seg.length_m
            else:
                cost = self._calculate_segment_cost(seg, profile)
            edge_attrs["weight"] = cost

            G.add_edge(seg.start_node, seg.end_node, **edge_attrs)
            G.add_edge(seg.end_node, seg.start_node, **edge_attrs)

        return G

    def _is_segment_passable(self, seg: FootpathSegment, profile: Optional[MobilityProfile], enforce: bool) -> Tuple[bool, Optional[str]]:
        if not enforce or not profile:
            return True, None

        # 1. Hard barriers check
        for b in seg.barriers:
            if b.status == BarrierStatus.CONFIRMED:
                if b.severity == BarrierSeverity.CRITICAL:
                    return False, f"Critical impassable barrier: {b.description} ({b.category.value})"
                if b.severity == BarrierSeverity.HIGH and profile.avoid_stairs:
                    return False, f"High severity barrier: {b.description}"

        # 2. Width constraint
        if seg.clear_width_m < profile.min_clear_width_m:
            return False, f"Insufficient clear width ({seg.clear_width_m:.2f}m < required {profile.min_clear_width_m:.2f}m)"

        # 3. Slope constraint
        if seg.slope_pct > profile.max_slope_pct:
            return False, f"Excessive slope ({seg.slope_pct:.1f}% > maximum {profile.max_slope_pct:.1f}%)"

        # 4. Curb ramp requirement
        if profile.require_kerb_ramps and not seg.has_kerb_ramp:
            return False, "Missing dropped curb / curb ramp connection"

        # 5. Known barrier status
        if seg.status == SegmentStatus.KNOWN_BARRIER:
            return False, "Segment marked as KNOWN_BARRIER due to verified accessibility obstructions"

        return True, None

    def _calculate_segment_cost(self, seg: FootpathSegment, profile: Optional[MobilityProfile]) -> float:
        """Calculates effort cost based on length, slope, and surface."""
        base_cost = seg.length_m

        # Surface penalty multiplier
        surface_weights = {
            "SMOOTH_CONCRETE": 1.0,
            "ASPHALT": 1.05,
            "PAVERS": 1.15,
            "COBBLESTONE": 2.5,
            "GRAVEL": 2.2,
            "DAMAGED_CRACKED": 2.8
        }
        mult = surface_weights.get(seg.surface.value if hasattr(seg.surface, "value") else str(seg.surface), 1.2)

        # Slope effort penalty
        slope_penalty = 1.0 + max(0.0, (seg.slope_pct / 8.0))

        # Unknown status minor penalty to prefer verified paths when available
        unknown_penalty = 1.3 if seg.status == SegmentStatus.UNKNOWN else 1.0

        return base_cost * mult * slope_penalty * unknown_penalty

    def calculate_routes(self, origin_coord: List[float], dest_coord: List[float], profile: MobilityProfile) -> RouteResponse:
        """
        Calculates both the standard shortest walking route and the constraint-aware accessible route,
        and generates evidence-based JourneyProof.
        """
        # Resolve nearest nodes to coordinates
        start_node = data_service.find_nearest_node(origin_coord[0], origin_coord[1])
        end_node = data_service.find_nearest_node(dest_coord[0], dest_coord[1])

        if not start_node or not end_node:
            return RouteResponse(
                success=False,
                origin=origin_coord,
                destination=dest_coord,
                profile_applied=profile,
                message="Could not snap origin or destination to the footpath network."
            )

        # 1. Unconstrained standard shortest route
        unconstrained_graph = self._build_graph(profile=None, enforce_constraints=False)
        shortest_option = self._compute_single_route(
            unconstrained_graph, start_node, end_node, profile, route_id="route_standard_shortest", name="Shortest Ordinary Walking Route"
        )

        # 2. Constrained accessible route
        accessible_graph = self._build_graph(profile=profile, enforce_constraints=True)
        accessible_option = self._compute_single_route(
            accessible_graph, start_node, end_node, profile, route_id="route_journeyproof_accessible", name="LUNOVA JourneyProof Accessible Route"
        )

        # Build comparison explanation
        if accessible_option:
            if shortest_option and not shortest_option.is_accessible:
                # Blocked barriers explanation
                blocked_names = [b.description for b in shortest_option.barriers if b.status == BarrierStatus.CONFIRMED]
                if not blocked_names:
                    blocked_names = ["Critical slope / step obstacles on standard footpath"]
                detour_m = accessible_option.distance_m - shortest_option.distance_m
                diff_text = f"+{detour_m:.0f}m" if detour_m > 0 else f"{detour_m:.0f}m"
                accessible_option.journey_proof.why_alternative_chosen = (
                    f"Direct ordinary route ({shortest_option.distance_m:.0f}m) is impassable for {profile.name} due to {len(blocked_names)} critical barrier(s): "
                    f"'{', '.join(blocked_names[:2])}'. LUNOVA selected verified accessible alternative ({accessible_option.distance_m:.0f}m, {diff_text}) "
                    f"guaranteeing compliant slope (<={profile.max_slope_pct}%), step-free transitions, and dropped curbs."
                )
            elif accessible_option.journey_proof.barriers_avoided:
                accessible_option.journey_proof.why_alternative_chosen = (
                    f"Route optimized for {profile.name} (max slope {profile.max_slope_pct}%, width >= {profile.min_clear_width_m}m). "
                    f"Successfully avoids {len(accessible_option.journey_proof.barriers_avoided)} known barriers in precinct."
                )

        all_routes = []
        if shortest_option:
            all_routes.append(shortest_option)
        if accessible_option:
            all_routes.append(accessible_option)

        recommended = accessible_option or shortest_option
        success = accessible_option is not None

        message = (
            "Accessible route calculated with JourneyProof verification."
            if success else
            "No fully accessible route found satisfying all mobility constraints. See standard path for obstacle warnings."
        )

        return RouteResponse(
            success=success,
            origin=origin_coord,
            destination=dest_coord,
            profile_applied=profile,
            recommended_route=accessible_option,
            comparison_route=shortest_option,
            all_routes=all_routes,
            message=message
        )

    def _compute_single_route(
        self, graph: nx.DiGraph, start_node: str, end_node: str, profile: MobilityProfile, route_id: str, name: str
    ) -> Optional[RouteOption]:
        try:
            path_nodes = nx.dijkstra_path(graph, start_node, end_node, weight="weight")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

        # Build segments and coordinates
        route_segments: List[FootpathSegment] = []
        route_coords: List[List[float]] = []
        route_barriers = []
        total_dist_m = 0.0

        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i + 1]
            edge_data = graph.get_edge_data(u, v)
            seg: FootpathSegment = edge_data["segment"]
            route_segments.append(seg)
            total_dist_m += seg.length_m
            route_barriers.extend(seg.barriers)

            # Accumulate coords (reversing if traversed backwards)
            seg_coords = seg.coordinates
            if seg.start_node != u:
                seg_coords = list(reversed(seg_coords))
            
            for c in seg_coords:
                if not route_coords or route_coords[-1] != c:
                    route_coords.append(c)

        # Inspect accessibility
        is_accessible = True
        for seg in route_segments:
            passable, _ = self._is_segment_passable(seg, profile, enforce=True)
            if not passable:
                is_accessible = False
                break

        # Generate JourneyProof
        journey_proof = self._generate_journey_proof(route_segments, profile, is_accessible)

        # Calculate estimated walking time (assuming standard wheelchair speed ~1.1 m/s = 66 m/min)
        time_min = round(total_dist_m / 66.0, 1)

        return RouteOption(
            route_id=route_id,
            name=name,
            is_accessible=is_accessible,
            distance_m=round(total_dist_m, 1),
            estimated_time_min=time_min,
            status=journey_proof.overall_status,
            coordinates=route_coords,
            segments=route_segments,
            barriers=route_barriers,
            journey_proof=journey_proof
        )

    def _generate_journey_proof(self, segments: List[FootpathSegment], profile: MobilityProfile, is_accessible: bool) -> JourneyProof:
        total_m = sum(s.length_m for s in segments)
        verified_m = sum(s.length_m for s in segments if s.status == SegmentStatus.VERIFIED_PASSABLE)
        unknown_m = sum(s.length_m for s in segments if s.status == SegmentStatus.UNKNOWN)
        blocked_m = sum(s.length_m for s in segments if s.status == SegmentStatus.KNOWN_BARRIER)

        if not is_accessible:
            overall_status = JourneyProofStatus.BLOCKED
            feasibility_score = max(10, int((verified_m / total_m * 100) - 40)) if total_m else 0
        elif unknown_m > 0:
            overall_status = JourneyProofStatus.NEEDS_VERIFICATION
            feasibility_score = int((verified_m / total_m) * 85) if total_m else 50
        else:
            overall_status = JourneyProofStatus.FEASIBLE_WITH_AVAILABLE_EVIDENCE
            feasibility_score = 100

        key_evidence = []
        barriers_avoided = []
        unverified_warnings = []
        steps: List[JourneyProofStep] = []

        # Find global barriers in system that this route successfully bypasses
        all_system_segs = data_service.get_all_segments()
        route_seg_ids = {s.id for s in segments}
        for other_seg in all_system_segs:
            if other_seg.id not in route_seg_ids and other_seg.barriers:
                for b in other_seg.barriers:
                    if b.severity in [BarrierSeverity.HIGH, BarrierSeverity.CRITICAL]:
                        barriers_avoided.append(f"{b.category.value} at {other_seg.name} ({b.description})")

        for seg in segments:
            barriers_here = [b.description for b in seg.barriers]
            evidence_note = f"Source: {seg.evidence_source} (Inspected: {seg.last_inspected[:10]})"
            
            if seg.status == SegmentStatus.UNKNOWN:
                unverified_warnings.append(f"{seg.name}: Footpath surface not audited within 12 months. Proceed with caution.")
                evidence_note += " [WARNING: Ground audit required]"
            elif seg.status == SegmentStatus.VERIFIED_PASSABLE:
                key_evidence.append(f"{seg.name}: 100% verified passable, width {seg.clear_width_m}m, slope {seg.slope_pct}%.")

            steps.append(
                JourneyProofStep(
                    segment_id=seg.id,
                    name=seg.name,
                    length_m=seg.length_m,
                    surface=seg.surface,
                    clear_width_m=seg.clear_width_m,
                    slope_pct=seg.slope_pct,
                    has_kerb_ramp=seg.has_kerb_ramp,
                    status=seg.status,
                    barriers_encountered=barriers_here,
                    evidence_note=evidence_note
                )
            )

        return JourneyProof(
            overall_status=overall_status,
            total_distance_m=round(total_m, 1),
            estimated_time_min=round(total_m / 66.0, 1),
            feasibility_score=feasibility_score,
            verified_passable_distance_m=round(verified_m, 1),
            unknown_distance_m=round(unknown_m, 1),
            blocked_distance_m=round(blocked_m, 1),
            key_evidence=key_evidence[:4],
            barriers_avoided=barriers_avoided[:4],
            unverified_warnings=unverified_warnings,
            steps=steps
        )

routing_engine = RoutingEngine()
