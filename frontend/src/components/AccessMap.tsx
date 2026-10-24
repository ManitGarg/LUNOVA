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

  // Initialize Map with real OpenStreetMap tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on Flinders St / Swanston St demonstration corridor
    const map = L.map(mapContainerRef.current, {
      center: [-37.8166, 144.9682],
      zoom: 16,
      zoomControl: true,
      attributionControl: true // Show contributor attribution at all times
    });

    // Standard OpenStreetMap raster tile provider (free, public, authentic)
    const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    });

    // Graceful error handling if a tile cannot be fetched
    osmTileLayer.on('tileerror', (e) => {
      console.warn('OpenStreetMap tile could not be loaded:', e);
    });

    osmTileLayer.addTo(map);

    // Create layer groups for routes, footpath segments, and barrier markers
    const segmentsLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    segmentsLayerRef.current = segmentsLayer;
    routesLayerRef.current = routesLayer;
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Ensure Leaflet resizes correctly when the container dimensions settle
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Map click handler to set destination coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      onDestinationChange([e.latlng.lat, e.latlng.lng]);
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Footpath Segments & Barrier Markers on Map
  useEffect(() => {
    if (!segmentsLayerRef.current || !mapRef.current) return;
    const layer = segmentsLayerRef.current;
    layer.clearLayers();

    segments.forEach((seg) => {
      let color = '#0284c7'; // default blue-cyan for audited passable footpath
      let dashArray = undefined;
      let opacity = 0.75;
      let weight = 5;

      if (seg.status === 'KNOWN_BARRIER') {
        color = '#dc2626';
        weight = 6;
        opacity = 0.85;
      } else if (seg.status === 'UNKNOWN') {
        color = '#d97706';
        dashArray = '6, 6';
        opacity = 0.8;
      }

      const polyline = L.polyline(seg.coordinates, {
        color,
        weight,
        opacity,
        dashArray
      }).addTo(layer);

      // Informative popup distinguishing real OSM map background from demo network
      const barrierNames = seg.barriers.map(b => `• <b>${b.category}</b> (${b.severity}): ${b.description}`).join('<br/>');
      const barrierHtml = barrierNames ? `<div style="margin-top:6px; color:#f87171; font-size:11px; background:#1e1b2e; padding:6px; border-radius:4px;">${barrierNames}</div>` : '';

      polyline.bindPopup(`
        <div style="font-family:system-ui; padding:4px; max-width:260px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h4 style="margin:0; color:#0284c7; font-size:13px; font-weight:700;">${seg.name}</h4>
            <span style="font-size:9px; background:#1e293b; color:#94a3b8; padding:2px 4px; border-radius:3px;">DEMO AUDIT</span>
          </div>
          <div style="font-size:11px; color:#cbd5e1; line-height:1.45;">
            Length: <b>${seg.length_m} m</b> • Surface: <b>${seg.surface}</b><br/>
            Clear Width: <b>${seg.clear_width_m} m</b> • Slope: <b>${seg.slope_pct}%</b><br/>
            Dropped Kerb: <b>${seg.has_kerb_ramp ? 'Yes' : 'No'}</b><br/>
            Audit Status: <b style="color:${color}">${seg.status}</b><br/>
            Evidence Source: <i style="color:#94a3b8">${seg.evidence_source}</i>
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
            background: #dc2626;
            color: #ffffff;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px rgba(220,38,38,0.8);
          " title="${b.category}: ${b.description}">⚠️</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([b.lat, b.lon], { icon: barrierIcon }).addTo(layer);
        marker.bindPopup(`
          <div style="font-family:system-ui; padding:4px; max-width:240px;">
            <div style="color:#ef4444; font-weight:800; font-size:12px; text-transform:uppercase;">
              ${b.category.replace(/_/g, ' ')}
            </div>
            <div style="font-size:12px; color:#f8fafc; margin:4px 0;">${b.description}</div>
            <div style="font-size:10px; color:#94a3b8;">
              Severity: <b style="color:#f87171">${b.severity}</b> • Provenance: ${b.detected_by}
            </div>
            ${b.image_url ? `<img src="${b.image_url}" style="width:100%; border-radius:6px; margin-top:6px; border:1px solid #334155;" alt="Barrier" />` : ''}
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

    // 1. Comparison / Shortest Blocked Route (Red dashed demonstration route)
    if (comparisonRoute && comparisonRoute.coordinates.length > 0 && !comparisonRoute.is_accessible) {
      L.polyline(comparisonRoute.coordinates, {
        color: '#dc2626',
        weight: 6,
        dashArray: '8, 8',
        opacity: 0.85
      }).addTo(layer).bindPopup(`
        <div style="padding:4px; font-family:system-ui;">
          <b style="color:#ef4444; font-size:12px;">[DEMO DATA] Ordinary Shortest Walk (${comparisonRoute.distance_m} m)</b><br/>
          <span style="font-size:11px; color:#cbd5e1;">Impassable for wheelchair: contains flight of 14 stone steps with 18cm risers.</span>
        </div>
      `);
    }

    // 2. JourneyProof Accessible Route (High-contrast Blue/Cyan with underlying halo)
    if (recommendedRoute && recommendedRoute.coordinates.length > 0) {
      // Background halo for clear visibility against OSM street tiles
      L.polyline(recommendedRoute.coordinates, {
        color: '#0f172a',
        weight: 10,
        opacity: 0.6
      }).addTo(layer);

      // Main line
      const routeLine = L.polyline(recommendedRoute.coordinates, {
        color: '#0284c7',
        weight: 6,
        opacity: 0.95
      }).addTo(layer);

      routeLine.bindPopup(`
        <div style="padding:4px; font-family:system-ui;">
          <b style="color:#0284c7; font-size:12px;">[DEMO DATA] JourneyProof Accessible Path (${recommendedRoute.distance_m} m)</b><br/>
          <span style="font-size:11px; color:#34d399;">Feasible with available audit evidence: step-free continuous grade underpass.</span>
        </div>
      `);
    }
  }, [recommendedRoute, comparisonRoute]);

  // Update Origin and Destination Markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // Origin Marker (Blue A)
    const originIcon = L.divIcon({
      className: 'custom-origin-icon',
      html: `<div style="
        background: #0284c7;
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(2,132,199,0.8);
      ">A</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const originMarker = L.marker(origin, { icon: originIcon, draggable: true }).addTo(layer);
    originMarker.bindPopup('<b>Origin</b><br/>Drag or click map to move');
    originMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onOriginChange([pos.lat, pos.lng]);
    });

    // Destination Marker (Green B)
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `<div style="
        background: #059669;
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(5,150,105,0.8);
      ">B</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const destMarker = L.marker(destination, { icon: destIcon, draggable: true }).addTo(layer);
    destMarker.bindPopup('<b>Destination</b><br/>Drag or click map to move');
    destMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onDestinationChange([pos.lat, pos.lng]);
    });
  }, [origin, destination]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '540px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '540px' }} />

      {/* Real Map / Data Integrity Notice Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '52px',
          background: 'rgba(15, 29, 54, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '6px 12px',
          zIndex: 1000,
          fontSize: '11px',
          color: '#cbd5e1',
          maxWidth: '420px',
          lineHeight: '1.4'
        }}
      >
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>Map Provider:</span> OpenStreetMap Standard Tiles.  
        <span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>
          *Note: Real map presence does not imply wheelchair accessibility. Overlays represent demonstration audited footpath segments.
        </span>
      </div>

      {/* Floating Legend */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(15, 29, 54, 0.94)',
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
          Demonstration Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#0284c7', borderRadius: '2px' }} />
          <span>JourneyProof Accessible Path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#dc2626', borderRadius: '2px' }} />
          <span>Ordinary Route (Blocked by Stairs)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#0d9488', borderRadius: '2px' }} />
          <span>Audited Passable Footpath</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '16px', height: '4px', background: '#d97706', borderRadius: '2px' }} />
          <span>Unknown / Pending Audit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>⚠️</span>
          <span>Detected Barrier (Click details)</span>
        </div>
      </div>
    </div>
  );
};
