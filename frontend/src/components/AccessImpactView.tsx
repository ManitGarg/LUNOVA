import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AccessImpactSummary } from '../types';
import { BarChart3, Wrench } from 'lucide-react';

export const AccessImpactView: React.FC = () => {
  const [summary, setSummary] = useState<AccessImpactSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getAccessImpact()
      .then(setSummary)
      .catch((err: any) => {
        console.error('Failed to load access impact:', err);
        setError(err.message || 'Failed to load access impact dashboard');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
        Loading AccessImpact Civic Dashboard...
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
        <p style={{ marginBottom: '12px' }}>{error || 'Failed to load AccessImpact data. Please check backend connection.'}</p>
        <button onClick={loadData} className="btn-secondary" style={{ margin: '0 auto' }}>
          Retry Dashboard Connection
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <BarChart3 size={20} color="#06b6d4" />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
            AccessImpact: Civic Infrastructure Prioritization
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
          Algorithmic barrier prioritization for municipal asset managers. Evaluates detour penalties, network centrality, and physical severity to maximize accessibility per infrastructure dollar.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="access-impact-kpis">
        <div className="card" style={{ background: '#091224', textAlign: 'center', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Network Accessibility</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#34d399', margin: '4px 0' }}>
            {summary.network_accessibility_pct}%
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Passable footpaths in precinct</div>
        </div>

        <div className="card" style={{ background: '#091224', textAlign: 'center', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Critical Blockers</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#f87171', margin: '4px 0' }}>
            {summary.critical_blockers_count}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Impassable stairs & missing curbs</div>
        </div>

        <div className="card" style={{ background: '#091224', textAlign: 'center', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Tracked Obstacles</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8', margin: '4px 0' }}>
            {summary.total_barriers_tracked}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Surveyed & crowdsourced</div>
        </div>

        <div className="card" style={{ background: '#091224', textAlign: 'center', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Pending Field Audits</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#fbbf24', margin: '4px 0' }}>
            {summary.pending_reports_count}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Awaiting verification</div>
        </div>
      </div>

      {/* Prioritized Interventions Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recommended Capital Works & Intervention Priorities
          </h4>
          <span style={{ fontSize: '11px', color: '#38bdf8' }}>
            Ranked by Detour Reduction & Network Impact
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                <th style={{ padding: '8px 10px' }}>Rank</th>
                <th style={{ padding: '8px 10px' }}>Location</th>
                <th style={{ padding: '8px 10px' }}>Barrier Type</th>
                <th style={{ padding: '8px 10px' }}>Detour Penalty</th>
                <th style={{ padding: '8px 10px' }}>Impact Score</th>
                <th style={{ padding: '8px 10px' }}>Recommended Engineering Fix</th>
              </tr>
            </thead>
            <tbody>
              {summary.priority_interventions.map((item, idx) => (
                <tr
                  key={item.barrier_id}
                  style={{
                    borderBottom: '1px solid #142036',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(15, 29, 54, 0.4)'
                  }}
                >
                  <td style={{ padding: '10px', fontWeight: 800, color: idx === 0 ? '#38bdf8' : '#e2e8f0' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ padding: '10px', color: '#f8fafc', fontWeight: 600 }}>
                    {item.location_name}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className={item.severity === 'CRITICAL' ? 'badge-barrier' : 'badge-warning'}>
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#fca5a5', fontWeight: 700 }}>
                    +{item.accessibility_detour_penalty_m} m
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '50px',
                        height: '6px',
                        background: '#1e293b',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${item.priority_score}%`,
                          height: '100%',
                          background: item.priority_score > 70 ? '#ef4444' : '#06b6d4'
                        }} />
                      </div>
                      <span style={{ fontWeight: 800, color: item.priority_score > 70 ? '#f87171' : '#38bdf8' }}>
                        {item.priority_score}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wrench size={13} color="#06b6d4" />
                      <span>{item.recommended_fix}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
