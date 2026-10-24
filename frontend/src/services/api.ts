import type {
  FootpathSegment,
  MobilityProfile,
  RouteResponse,
  RealityPulseReport,
  AccessImpactSummary
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getSegments(): Promise<FootpathSegment[]> {
    const res = await fetch(`${API_BASE}/segments`);
    if (!res.ok) throw new Error('Failed to fetch segments');
    return res.json();
  },

  async getNodes(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/nodes`);
    if (!res.ok) throw new Error('Failed to fetch nodes');
    return res.json();
  },

  async calculateRoutes(
    origin: [number, number],
    destination: [number, number],
    profile: MobilityProfile
  ): Promise<RouteResponse> {
    const res = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, profile })
    });
    if (!res.ok) throw new Error('Route calculation failed');
    return res.json();
  },

  async analyzeImage(file: File, manualCategoryHint?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (manualCategoryHint) {
      formData.append('manual_category_hint', manualCategoryHint);
    }
    const res = await fetch(`${API_BASE}/analyze-image`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Image analysis failed');
    return res.json();
  },

  async getSampleFixtures(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error('Failed to fetch sample fixtures');
    return res.json();
  },

  async getReports(): Promise<RealityPulseReport[]> {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async createReport(data: {
    category: string;
    severity: string;
    lat: number;
    lon: number;
    segment_id?: string;
    description: string;
    image_url?: string;
  }): Promise<RealityPulseReport> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Report submission failed');
    return res.json();
  },

  async verifyReport(reportId: string, verifierName: string = 'Civic Auditor'): Promise<RealityPulseReport> {
    const res = await fetch(
      `${API_BASE}/reports/${encodeURIComponent(reportId)}/verify?verifier_name=${encodeURIComponent(verifierName)}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error('Report verification failed');
    return res.json();
  },

  async rejectReport(reportId: string): Promise<RealityPulseReport> {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/reject`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Report rejection failed');
    return res.json();
  },

  async getAccessImpact(): Promise<AccessImpactSummary> {
    const res = await fetch(`${API_BASE}/impact`);
    if (!res.ok) throw new Error('Failed to fetch impact dashboard');
    return res.json();
  },

  async resetDemo(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/reset-demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Demo reset failed');
    return res.json();
  }
};
