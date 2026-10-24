# LUNOVA — AI-Powered Accessible Navigation Platform

> **Tagline:** Every journey should be possible.  
> **Team:** ELUNOR  
> **Problem Statement:** Smart Cities Problem Statement SC-02: Accessible Walking Routes from Street Imagery  
> **Core Differentiator:** JourneyProof — Evidence-Aware Verification of Route Feasibility  

---

## 1. Project Overview

Traditional navigation engines (e.g., Google Maps, Apple Maps) prioritize raw distance. For wheelchair users and people with mobility limitations, the shortest path frequently leads directly into impassable flight of stairs, steep cobblestones, or unramped curbs.

**LUNOVA** transforms accessible navigation by pairing street-level obstacle detection with constraint-aware routing and an auditable **JourneyProof** evidence engine. Rather than assuming a route is accessible merely because no obstacle was reported, LUNOVA verifies each footpath segment against physical mobility constraints and provides explicit evidence breakdowns.

---

## 2. Key Modules & Features

1. **JourneyProof™ (Flagship Feature):**
   - Computes feasibility state: `FEASIBLE_WITH_AVAILABLE_EVIDENCE`, `BLOCKED`, or `NEEDS_VERIFICATION`.
   - Explains the exact evidence and reason an alternative detour was chosen (e.g., direct 320m route blocked by 14 stone steps with 18cm risers; rerouted via 635m continuous grade underpass ramp).
   - Generates an auditable segment-by-segment trail displaying surface type, width, gradient, curb ramps, and last inspection timestamp.

2. **VisionScan (AI Barrier Detection & Live Camera):**
   - Live browser camera capture via `getUserMedia` (with environment facing-mode, viewfinder, capture, review, retake, and use photo controls).
   - Local image upload and file drag-and-drop.
   - Automated computer-vision pipeline analyzing street imagery for accessibility obstacles:
     - Stairs and steps (horizontal gradient striation frequencies)
     - Missing / unsuitable kerb ramps (vertical elevation difference)
     - Broken / uneven footpath surfaces (edge density and texture variance)
     - Utility poles and corridor encroachments (clear width violations)
     - Parked vehicles blocking sidewalks
   - Includes 1-click benchmark test cases for rapid evaluation without file downloads.
   - Transparent methodology: automated gradient/texture feature extraction clearly labeled alongside manual analyst assist.

3. **AccessMap (Footpath Accessibility Graph, Real Map & Live GPS):**
   - Real-world OpenStreetMap standard raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) with continuous contributor attribution.
   - Distinct visualization for verified passable segments (Cyan/Blue), known barrier segments (Red), and unknown segments (Amber dashed).
   - **Live GPS Location & Tracking:**
     - On-demand **"Locate Me"** button via browser `navigator.geolocation.getCurrentPosition()`.
     - Optional continuous **"Start Live Tracking"** using `navigator.geolocation.watchPosition()`.
     - Displays pulsing blue location dot and translucent accuracy perimeter circle ($\pm X\text{m}$).
     - Automatically cleans up location watchers on stop or component unmount.
     - Strict client-side privacy: coordinates are processed solely in the browser and never transmitted or stored on the backend.
     - One-click popup action to set your live position as Route Origin (A).
   - Robust container resizing via `ResizeObserver` and graceful tile error handling.
   - Interactive obstacle pins with detailed severity badges and inspection popups.

4. **MobilityRoute (Constraint-Aware Routing Engine):**
   - Built with NetworkX using Dijkstra and A* pathfinding.
   - Multi-profile support: Manual Wheelchair, Power Wheelchair, Walking Frame / Rollator, Stroller, and Custom Profiles.
   - Custom sliders for minimum clear width (m), maximum manageable gradient (%), dropped curb enforcement, and stair avoidance.
   - Simultaneous calculation of the unconstrained shortest route vs. the accessible route for comparison.

5. **RealityPulse (Community Barrier Feedback Loop):**
   - Crowdsourced barrier reporting interface with category, severity, description, and GPS association.
   - Safety audit queue: new reports remain `PENDING_VERIFICATION` until verified by trusted auditors, preventing fraudulent or mistaken disruptions.
   - Instant verification triggers dynamic graph updates, barrier generation, and immediate real-time route recalculation.

6. **AccessImpact (Civic Infrastructure Dashboard):**
   - Prioritizes physical repairs based on detour penalties (m), network centrality, and severity.
   - Generates actionable civil engineering recommendations (e.g., install 1:14 ramp, install dropped curb with TGSI tactile pavers).

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Leaflet, Lucide Icons, Custom Dark-Navy & Cyan CSS Design System.
- **Backend:** Python 3.14+, FastAPI, Uvicorn, NetworkX, Pillow (PIL), Pydantic v2.
- **Testing:** Pytest, HTTPX, TypeScript (`tsc -b`), Vite production bundler.
- **Data & Persistence:** Lightweight persistent JSON store (`backend/data/store.json`) seeded from deterministic benchmark network (`data/demo_network.json`).

---

## 4. Project Structure

```text
Lunova/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI entry point, CORS, static uploads
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── endpoints.py       # REST endpoints (health, routes, vision, reports, impact)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py         # Pydantic data schemas & enums
│   │   ├── routing/
│   │   │   ├── __init__.py
│   │   │   └── graph_engine.py    # NetworkX Dijkstra routing & JourneyProof generator
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── cv_service.py      # VisionScan image feature extraction & analysis
│   │       └── data_service.py    # Persistent store & AccessImpact prioritization
│   ├── data/                      # Persistent local storage
│   ├── uploads/                   # Uploaded street imagery
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── demo_assets/           # Verified benchmark images for 1-click testing
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccessImpactView.tsx
│   │   │   ├── AccessMap.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── JourneyProofPanel.tsx
│   │   │   ├── MobilityProfileSelector.tsx
│   │   │   ├── RealityPulseView.tsx
│   │   │   └── VisionScanView.tsx
│   │   ├── services/
│   │   │   └── api.ts             # Typed REST API client
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces & types
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   └── demo_network.json          # Benchmark footpath network & barriers
├── tests/
│   └── test_backend.py            # Automated test suite (6/6 passing)
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Quickstart & Installation (Windows)

### Prerequisites
- Node.js v18+ (tested on v24.19.0)
- Python 3.10+ (tested on Python 3.14.5)
- Git

### 1. Backend Setup
From the repository root (`c:\Users\Admin\Desktop\Lunova`):

```powershell
# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend\requirements.txt
```

### 2. Frontend Setup
From the repository root:

```powershell
cd frontend
npm install
cd ..
```

---

## 6. Running the Application

### Start the Backend Server (Terminal 1)
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will be running at:* `http://127.0.0.1:8000`  
*Interactive Swagger Documentation:* `http://127.0.0.1:8000/docs`

### Start the Frontend Dev Server (Terminal 2)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend application will be accessible at:* `http://127.0.0.1:5173`

---

## 7. Running the Automated Test Suite

Run the full end-to-end backend test suite:
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python -m pytest -v tests\test_backend.py
```
*All 6 tests verify:*
- Backend health and network loading
- Footpath segment integrity
- Wheelchair route constraint enforcement & barrier exclusion
- RealityPulse report submission and verification loop
- AccessImpact algorithmic ranking
- VisionScan benchmark fixtures

Run the frontend TypeScript & production build verification:
```powershell
cd frontend
npm run build
```

---

## 8. API Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, loaded segments, and tracked reports |
| `GET` | `/api/segments` | All footpath segments, barriers, surface conditions, and audit sources |
| `GET` | `/api/nodes` | Landmark nodes and coordinates |
| `POST` | `/api/routes` | Constraint-aware route calculation + JourneyProof evidence |
| `POST` | `/api/analyze-image` | VisionScan obstacle detection from street imagery |
| `GET` | `/api/samples` | 1-click test fixtures for obstacle detection |
| `GET` | `/api/reports` | Crowdsourced RealityPulse barrier reports |
| `POST` | `/api/reports` | Submit community barrier report (`PENDING_VERIFICATION`) |
| `POST` | `/api/reports/{id}/verify` | Verify report, add confirmed barrier, update graph & persist |
| `POST` | `/api/reports/{id}/reject` | Dismiss report without modifying network |
| `GET` | `/api/impact` | Civic infrastructure prioritization summary & ranked fixes |
| `POST` | `/api/reset-demo` | Reset state to clean baseline |

---

## 9. Recommended Demonstration Workflow for Judges

1. **Open the App:** Navigate to `http://127.0.0.1:5173` in any browser.
2. **Examine the Map:** Observe the dark-navy interface with Cyan passable paths and Red obstacle segments (St. Paul's Heritage Steps).
3. **Test Live GPS Location:**
   - Click the **"Locate Me"** button on the map control overlay.
   - Accept the browser's location permission prompt.
   - Observe the pulsing blue GPS position dot and accuracy circle on the map.
   - Click the GPS marker popup to inspect coordinates and estimated accuracy ($\pm X\text{m}$), or click **"Set as Route Origin (A)"**.
   - Click **"Start Live Tracking"** to update coordinates continuously as you move, and verify **"Tracking: Active"** state.
   - Click **"Stop Tracking"** to verify location tracking cleanly stops.
4. **Trigger Route Comparison:**
   - Click the preset: **"Central Station → Civic Centre"**.
   - Notice the **Ordinary Shortest Walk** (320m) is marked **BLOCKED** with a red dashed line due to the 14 stone steps.
   - Notice the **LUNOVA Accessible Path** (635m, glowing cyan) selects the continuous ramp way (+315m detour).
4. **Inspect JourneyProof™:**
   - Observe the **100% FEASIBLE WITH AVAILABLE EVIDENCE** badge.
   - Read the transparent explanation in *"Why This Route Was Selected"*.
   - Expand the **Audit Trail** to inspect every segment's surface, clear width, grade, and curb ramp.
5. **Adjust Mobility Profile:**
   - Switch to **Custom Profile** and adjust the slope slider or uncheck "Require Dropped Kerbs" to see route dynamics.
6. **Test VisionScan AI:**
   - Switch to the **VisionScan AI** tab.
   - Click the **"Heritage Tiered Steps"** or **"Missing Kerb Ramp"** benchmark card (or upload an image).
   - View the bounding box overlay, edge density metrics, and horizontal striation frequency analysis.
   - Click **"Submit to RealityPulse Verification Queue"**.
7. **Test the RealityPulse Live Update Loop:**
   - Switch to the **RealityPulse** tab.
   - Click **"Verify Barrier"** on any pending report.
   - Switch back to **AccessMap**: notice the segment turns Red and the route recalculates immediately around the new barrier!
8. **Inspect AccessImpact:**
   - Switch to the **AccessImpact** tab.
   - View the ranked infrastructure repair leaderboard showing detour reduction penalties and engineering recommendations.
9. **Reset Demo:**
   - Click the **"Reset Demo"** button in the header at any time to return to the original clean state.

---

## 10. AI Capabilities & Transparency Statement

In strict compliance with hackathon guidelines (Section 5.2):
- **Automated AI:** VisionScan performs genuine computer-vision feature analysis using Pillow/NumPy algorithms:
  - Horizontal intensity gradient variance to detect stair risers and steps.
  - Multi-scale edge density and texture roughness to detect cracked/damaged pavement.
  - Elevation difference heuristics to assess curb drops.
- **Transparent Fallback:** When features fall below certainty thresholds, VisionScan explicitly marks detections as `AUTOMATED_VISION_SCAN` with moderate confidence and provides a manual verification assist workflow.
- **Zero Fabrication:** GPS coordinates, confidence numbers, and barrier records are grounded directly in the deterministic graph and audited community reports.

---

## 11. Geolocation & Privacy Statement

- **Client-Side Geolocation:** All GPS position and tracking coordinates retrieved via `navigator.geolocation` remain strictly in the browser memory for rendering on the Leaflet map. They are never sent, logged, or persisted on the backend server.
- **Permission & Security Requirements:** Requires an HTTPS context or `localhost` / `127.0.0.1`. The application never requests location permissions automatically; it prompts only after the user explicitly clicks **"Locate Me"** or **"Start Live Tracking"**.
- **Data Integrity & Safety Notice:** The presence of a live GPS position does not imply that nearby roads or sidewalks are wheelchair-accessible. Accessible route calculation is verified only where grounded footpath audit records exist.

---

## 12. Stopping and Restarting

To stop the servers:
- In the PowerShell terminals running Uvicorn and Vite, press `CTRL + C`.

To restart:
- Run the commands specified in **Section 6**.
