import React from 'react';
import type { RouteOption, MobilityProfile } from '../types';
import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2,
  Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface Props {
  route: RouteOption;
  profile: MobilityProfile;
  comparisonRoute?: RouteOption;
}

export const JourneyProofPanel: React.FC<Props> = ({ route }) => {
  const [expandedSteps, setExpandedSteps] = React.useState(false);
  const proof = route.journey_proof;

  const isFeasible = proof.overall_status === 'FEASIBLE_WITH_AVAILABLE_EVIDENCE';
  const isBlocked = proof.overall_status === 'BLOCKED';
  const isNeedsVerification = proof.overall_status === 'NEEDS_VERIFICATION';

  const statusBg = isFeasible
    ? 'rgba(16, 185, 129, 0.12)'
    : isBlocked
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(245, 158, 11, 0.15)';

  const statusBorder = isFeasible
    ? '1px solid rgba(16, 185, 129, 0.35)'
    : isBlocked
    ? '1px solid rgba(239, 68, 68, 0.4)'
    : '1px solid rgba(245, 158, 11, 0.4)';

  const statusColor = isFeasible ? '#34d399' : isBlocked ? '#f87171' : '#fbbf24';

  const statusIcon = isFeasible ? (
    <CheckCircle2 size={20} color="#10b981" />
  ) : isBlocked ? (
    <XCircle size={20} color="#ef4444" />
  ) : (
    <AlertTriangle size={20} color="#f59e0b" />
  );

  return (
    <div className="card" style={{ padding: '16px', background: '#0b162c' }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#06b6d4" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
            JourneyProof™ Verification
          </h3>
        </div>
        <span style={{ fontSize: '10px', color: '#38bdf8', background: '#070d18', padding: '3px 8px', borderRadius: '4px', border: '1px solid #1e293b' }}>
          Evidence Audit Engine
        </span>
      </div>

      {/* Main Feasibility Banner */}
      <div
        style={{
          background: statusBg,
          border: statusBorder,
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '14px'
        }}
      >
        <div>{statusIcon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: statusColor, textTransform: 'uppercase' }}>
            {proof.overall_status.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
            {isFeasible && 'All route segments are supported by verified demonstration audit records.'}
            {isBlocked && 'Confirmed physical barriers make this route impassable.'}
            {isNeedsVerification && 'One or more sections lack recent ground audit validation. Caution required.'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: statusColor }}>
            {isFeasible ? 'EVIDENCE VERIFIED' : (isBlocked ? 'IMPASSABLE' : 'UNVERIFIED')}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
            {proof.verified_passable_distance_m}m / {proof.total_distance_m}m Audited
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        <div style={{ background: '#091224', padding: '10px', borderRadius: '8px', border: '1px solid #1a2744', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Route Distance</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{route.distance_m} m</div>
        </div>
        <div style={{ background: '#091224', padding: '10px', borderRadius: '8px', border: '1px solid #1a2744', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Est. Travel Time</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>{route.estimated_time_min} min</div>
        </div>
        <div style={{ background: '#091224', padding: '10px', borderRadius: '8px', border: '1px solid #1a2744', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Audited Passable</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#34d399' }}>{proof.verified_passable_distance_m} m</div>
        </div>
      </div>

      {/* Demonstration Notice */}
      <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '12px', fontSize: '10px', color: '#94a3b8' }}>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>[Demonstration Network]</span> Feasibility is computed over our surveyed test graph. Standard roads on the base map without audited footpath segments are never assumed safe.
      </div>

      {/* Why Alternative Chosen */}
      {proof.why_alternative_chosen && (
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
            <Info size={14} />
            Why This Route Was Selected
          </div>
          <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.45' }}>
            {proof.why_alternative_chosen}
          </p>
        </div>
      )}

      {/* Barriers Avoided Chips */}
      {proof.barriers_avoided.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
            Barriers Successfully Avoided ({proof.barriers_avoided.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {proof.barriers_avoided.map((b, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px'
                }}
              >
                🚫 {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unverified Section Warnings */}
      {proof.unverified_warnings.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px', textTransform: 'uppercase' }}>
            ⚠️ Unknown / Unverified Sections
          </div>
          {proof.unverified_warnings.map((w, idx) => (
            <div key={idx} style={{ fontSize: '11px', color: '#fde68a', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 8px', borderRadius: '4px', marginBottom: '4px' }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Step by step Accordion */}
      <div>
        <button
          onClick={() => setExpandedSteps(!expandedSteps)}
          style={{
            width: '100%',
            background: '#091224',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <span>Audit Trail: {proof.steps.length} Route Segments</span>
          {expandedSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSteps && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {proof.steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  background: '#070d18',
                  border: '1px solid #1a2744',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                    {idx + 1}. {step.name}
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{step.length_m} m</span>
                </div>
                <div style={{ color: '#94a3b8', margin: '3px 0' }}>
                  Surface: <span style={{ color: '#e2e8f0' }}>{step.surface}</span> • Width: <span style={{ color: '#e2e8f0' }}>{step.clear_width_m}m</span> • Grade: <span style={{ color: '#e2e8f0' }}>{step.slope_pct}%</span> • Dropped Kerb: <span style={{ color: step.has_kerb_ramp ? '#34d399' : '#f87171' }}>{step.has_kerb_ramp ? 'Yes' : 'No'}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '10px' }}>
                  {step.evidence_note}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
