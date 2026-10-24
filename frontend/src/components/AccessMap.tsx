import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { FootpathSegment, RouteOption } from '../types';

interface Props {
  segments: FootpathSegment[];
  recommendedRoute?: RouteOption;
  comparisonRoute?: RouteOption;
  origin: [number, number];
  destination: [number, number];
  onOriginChange: (coord: [number, number]) => void;
  onDestinationChange: (coord: [number, number]) => void;
  onSelectSegment?: (segment: FootpathSegment) => void;
}

export const AccessMap: React.FC<Props> = ({
  segments,
  recommendedRoute,
  comparisonRoute,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onSelectSegment
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const segmentsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-37.8166, 144.9682],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    // Dark Matter tile layer for cohesive dark-navy interface
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Create layer groups
    const segmentsLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    segmentsLayerRef.current = segmentsLayer;
    routesLayerRef.current = routesLayer;
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Map click handler to set destination or origin
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Toggle setting destination on click
      onDestinationChange([e.latlng.lat, e.latlng.lng]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Segments & Barrier Markers
  useEffect(() => {
    if (!segmentsLayerRef.current || !mapRef.current) return;
    const layer = segmentsLayerRef.current;
    layer.clearLayers();

    segments.forEach((seg) => {
      let color = '#06b6d4'; // default cyan for passable
      let dashArray = undefined;
      let opacity = 0.65;
      let weight = 4;

      if (seg.status === 'KNOWN_BARRIER') {
        color = '#ef4444';
        weight = 5;
        opacity = 0.8;
      } else if (seg.status === 'UNKNOWN') {
        color = '#f59e0b';
        dashArray = '6, 6';
        opacity = 0.7;
      }

      const polyline = L.polyline(seg.coordinates, {
        color,
        weight,
        opacity,
        dashArray
      }).addTo(layer);

      // Popup
      const barrierNames = seg.barriers.map(b => `• <b>${b.category}</b>: ${b.description}`).join('<br/>');
      const barrierHtml = barrierNames ? `<div style="margin-top:6px; color:#fca5a5; font-size:11px;">${barrierNames}</div>` : '';

      polyline.bindPopup(`
        <div style="font-family:system-ui; padding:4px;">
          <h4 style="margin:0 0 4px 0; color:#38bdf8; font-size:13px;">${seg.name}</h4>
          <div style="font-size:11px; color:#94a3b8; line-height:1.4;">
            Length: <b>${seg.length_m}m</b> • Surface: <b>${seg.surface}</b><br/>
            Clear Width: <b>${seg.clear_width_m}m</b> • Slope: <b>${seg.slope_pct}%</b><br/>
            Kerb Ramp: <b>${seg.has_kerb_ramp ? 'Yes' : 'No'}</b><br/>
            Status: <b style="color:${color}">${seg.status}</b><br/>
            Source: <i style="color:#cbd5e1">${seg.evidence_source}</i>
          </div>
          ${barrierHtml}
        </div>
      `);

      polyline.on('click', () => {
        if (onSelectSegment) onSelectSegment(seg);
      });

      // Add barrier icon markers on map
      seg.barriers.forEach((b) => {
        const barrierIcon = L.divIcon({
          className: 'custom-barrier-icon',
          html: `<div style="
            background: #ef4444;
            color: #ffffff;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px rgba(239,68,68,0.7);
          ">⚠️</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([b.lat, b.lon], { icon: barrierIcon }).addTo(layer);
        marker.bindPopup(`
          <div style="font-family:system-ui; padding:4px;">
            <div style="color:#ef4444; font-weight:bold; font-size:12px; text-transform:uppercase;">
              ${b.category.replace(/_/g, ' ')}
            </div>
            <div style="font-size:12px; color:#f8fafc; margin:4px 0;">${b.description}</div>
            <div style="font-size:10px; color:#94a3b8;">
              Severity: <b style="color:#f87171">${b.severity}</b> • Detected by: ${b.detected_by}
            </div>
            ${b.image_url ? `<img src="${b.image_url}" style="width:100%; border-radius:6px; margin-top:6px;" alt="Barrier" />` : ''}
          </div>
        `);
      });
    });
  }, [segments]);

  // Update Route Polylines
  useEffect(() => {
    if (!routesLayerRef.current || !mapRef.current) return;
    const layer = routesLayerRef.current;
    layer.clearLayers();

    // 1. Comparison / Shortest Blocked Route (Red dashed)
    if (comparisonRoute && comparisonRoute.coordinates.length > 0 && !comparisonRoute.is_accessible) {
      L.polyline(comparisonRoute.coordinates, {
        color: '#ef4444',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.75
      }).addTo(layer).bindPopup(`
        <div style="padding:4px;">
          <b style="color:#ef4444;">Shortest Ordinary Route (${comparisonRoute.distance_m}m)</b><br/>
          <span style="font-size:11px; color:#cbd5e1;">Impassable due to stairs / steep obstacles.</span>
        </div>
      `);
    }

    // 2. JourneyProof Accessible Route (Glowing Bright Cyan)
    if (recommendedRoute && recommendedRoute.coordinates.length > 0) {
      // Background glow
      L.polyline(recommendedRoute.coordinates, {
        color: '#06b6d4',
        weight: 10,
        opacity: 0.3
      }).addTo(layer);

      // Main line
      const routeLine = L.polyline(recommendedRoute.coordinates, {
        color: '#38bdf8',
        weight: 6,
        opacity: 0.95
      }).addTo(layer);

      routeLine.bindPopup(`
        <div style="padding:4px;">
          <b style="color:#38bdf8;">JourneyProof Accessible Route (${recommendedRoute.distance_m}m)</b><br/>
          <span style="font-size:11px; color:#34d399;">100% Feasible with verified accessible segments.</span>
        </div>
      `);
    }
  }, [recommendedRoute, comparisonRoute]);

  // Update Origin and Destination Markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // Origin Marker (Cyan A)
    const originIcon = L.divIcon({
      className: 'custom-origin-icon',
      html: `<div style="
        background: #0284c7;
        color: #ffffff;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(2,132,199,0.8);
      ">A</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const originMarker = L.marker(origin, { icon: originIcon, draggable: true }).addTo(layer);
    originMarker.bindPopup('<b>Origin</b><br/>Drag to move');
    originMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onOriginChange([pos.lat, pos.lng]);
    });

    // Destination Marker (Green B)
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `<div style="
        background: #10b981;
        color: #ffffff;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(16,185,129,0.8);
      ">B</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const destMarker = L.marker(destination, { icon: destIcon, draggable: true }).addTo(layer);
    destMarker.bindPopup('<b>Destination</b><br/>Drag or click map to move');
    destMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onDestinationChange([pos.lat, pos.lng]);
    });
  }, [origin, destination]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '520px' }} />

      {/* Floating Legend / Quick Preset Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(15, 29, 54, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '8px 12px',
          zIndex: 1000,
          fontSize: '11px',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Map Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#38bdf8', borderRadius: '2px' }} />
          <span>JourneyProof Accessible Path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#ef4444', borderRadius: '2px' }} />
          <span>Ordinary Route (Blocked by Stairs)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#06b6d4', borderRadius: '2px' }} />
          <span>Verified Passable Footpath</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#f59e0b', borderRadius: '2px' }} />
          <span>Unknown / Pending Audit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>⚠️</span>
          <span>Detected Barrier (Click for details)</span>
        </div>
      </div>
    </div>
  );
};
