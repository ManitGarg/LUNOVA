import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { RealityPulseReport, FootpathSegment } from '../types';
import { Activity, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  segments: FootpathSegment[];
  onReportVerified?: () => void;
}

export const RealityPulseView: React.FC<Props> = ({ segments, onReportVerified }) => {
  const [reports, setReports] = useState<RealityPulseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [category, setCategory] = useState('POLE_OR_OBSTRUCTION');
  const [severity, setSeverity] = useState('HIGH');
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getReports();
      // sort latest first
      data.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
      setReports(data);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setErrorMsg(err.message || 'Failed to load reports from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setActionMsg(null);

    // Get lat/lon from selected segment
    const seg = segments.find(s => s.id === selectedSegmentId) || segments[0];
    const lat = seg?.coordinates[0][0] || -37.8175;
    const lon = seg?.coordinates[0][1] || 144.9695;

    try {
      await api.createReport({
        category,
        severity,
        lat,
        lon,
        segment_id: selectedSegmentId,
        description
      });
      setDescription('');
      setShowForm(false);
      setActionMsg('New barrier report submitted! Currently pending community audit.');
      fetchReports();
    } catch (err: any) {
      setActionMsg('Failed to submit report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      await api.verifyReport(reportId, 'ELUNOR Lead Auditor');
      setActionMsg('Barrier verified! Accessible routing graph updated and persistent store saved.');
      fetchReports();
      if (onReportVerified) onReportVerified();
    } catch (err: any) {
      setActionMsg('Verification failed: ' + err.message);
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      await api.rejectReport(reportId);
      setActionMsg('Report rejected. Footpath graph remains unchanged.');
      fetchReports();
    } catch (err: any) {
      setActionMsg('Rejection failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#06b6d4" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              RealityPulse: Community Barrier Feedback Loop
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Crowdsourced and field-verified reporting. Reports remain <b>PENDING</b> until verified by trusted auditors, preventing false graph disruptions.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <PlusCircle size={16} />
          {showForm ? 'Close Form' : 'Report Barrier'}
        </button>
      </div>

      {actionMsg && (
        <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#38bdf8', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>
          {actionMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button onClick={fetchReports} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Retry</button>
        </div>
      )}

      {/* New Report Form Modal / Dropdown */}
      {showForm && (
        <form onSubmit={handleCreateReport} className="card" style={{ background: '#091224', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>Submit Accessibility Barrier</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', background: '#070d18', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
              >
                <option value="STAIRS_OR_STEPS">Stairs / Steps</option>
                <option value="MISSING_KERB_RAMP">Missing Kerb Ramp</option>
                <option value="BROKEN_UNEVEN_SURFACE">Broken / Uneven Surface</option>
                <option value="POLE_OR_OBSTRUCTION">Pole / Fixed Obstruction</option>
                <option value="PARKED_VEHICLE_BLOCKING_PATH">Parked Vehicle Blocking Path</option>
                <option value="NARROW_PASSAGE">Narrow Passage / Construction</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ width: '100%', background: '#070d18', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
              >
                <option value="LOW">Low (Minor Unevenness)</option>
                <option value="MODERATE">Moderate (Needs Caution)</option>
                <option value="HIGH">High (Impassable for Manual Chairs)</option>
                <option value="CRITICAL">Critical (Total Route Blockage)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Associated Segment</label>
              <select
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                style={{ width: '100%', background: '#070d18', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
              >
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.length_m}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Description & Observations</label>
            <input
              type="text"
              placeholder="e.g. Scaffolding set up across footpath reducing clear width to 50cm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ width: '100%', background: '#070d18', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ fontSize: '12px' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary" style={{ fontSize: '12px' }}>
              Submit Report (Pending Audit)
            </button>
          </div>
        </form>
      )}

      {/* Reports Feed & Audit Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Community Reports & Verifier Queue ({reports.length})
          </h4>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Click 'Verify Barrier' to test the live graph rerouting!
          </span>
        </div>

        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
            No community reports recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reports.map((rep) => {
              const isPending = rep.status === 'PENDING_VERIFICATION';
              const isVerified = rep.status === 'VERIFIED';
              const isRejected = rep.status === 'REJECTED';

              return (
                <div
                  key={rep.id}
                  style={{
                    background: '#091224',
                    border: '1px solid #1a2744',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={isVerified ? 'badge-passable' : (isPending ? 'badge-warning' : 'badge-barrier')}>
                        {rep.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                        {rep.category.replace(/_/g, ' ')}
                      </span>
                      <span className={rep.severity === 'CRITICAL' ? 'badge-barrier' : 'badge-warning'} style={{ fontSize: '10px' }}>
                        {rep.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {rep.description}
                    </div>

                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      Reported: {rep.reported_at?.slice(0, 16).replace('T', ' ')} • Lat: {rep.lat.toFixed(4)}, Lon: {rep.lon.toFixed(4)}
                      {rep.verified_by && ` • Verified by: ${rep.verified_by}`}
                    </div>
                  </div>

                  {/* Verifier Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleVerify(rep.id)}
                          className="btn-success"
                          style={{ fontSize: '11px', padding: '6px 10px' }}
                          title="Confirm barrier and update route network"
                        >
                          <CheckCircle2 size={13} />
                          Verify Barrier
                        </button>
                        <button
                          onClick={() => handleReject(rep.id)}
                          className="btn-danger"
                          style={{ fontSize: '11px', padding: '6px 10px' }}
                          title="Reject false report"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: isVerified ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {isVerified ? '✓ Incorporated in Graph' : '✗ Dismissed'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
