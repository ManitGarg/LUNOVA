import React from 'react';
import { ShieldCheck, Compass, Eye, Activity, BarChart2, RefreshCw, AlertCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'vision' | 'reports' | 'impact';
  setActiveTab: (tab: 'map' | 'vision' | 'reports' | 'impact') => void;
  backendHealthy: boolean;
  onResetDemo: () => void;
  resetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  backendHealthy,
  onResetDemo,
  resetting
}) => {
  return (
    <header className="app-header">
      {/* Brand & Team */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
          flexShrink: 0
        }}>
          <ShieldCheck size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#f8fafc' }}>
              LUNOVA
            </span>
            <span style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              TEAM ELUNOR
            </span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              SC-02 SMART CITIES
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.2px' }}>
            Every journey should be possible. • <span style={{ color: '#38bdf8' }}>JourneyProof</span> Verified
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="app-header-nav">
        <button
          onClick={() => setActiveTab('map')}
          style={{
            padding: '7px 14px',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'map' ? '#06b6d4' : 'transparent',
            color: activeTab === 'map' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          <Compass size={16} />
          AccessMap & Routing
        </button>

        <button
          onClick={() => setActiveTab('vision')}
          style={{
            padding: '7px 14px',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'vision' ? '#06b6d4' : 'transparent',
            color: activeTab === 'vision' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          <Eye size={16} />
          VisionScan AI
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '7px 14px',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'reports' ? '#06b6d4' : 'transparent',
            color: activeTab === 'reports' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          <Activity size={16} />
          RealityPulse
        </button>

        <button
          onClick={() => setActiveTab('impact')}
          style={{
            padding: '7px 14px',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'impact' ? '#06b6d4' : 'transparent',
            color: activeTab === 'impact' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          <BarChart2 size={16} />
          AccessImpact
        </button>
      </nav>

      {/* System Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#0c1629',
          padding: '5px 10px',
          borderRadius: '6px',
          border: '1px solid #1e293b',
          fontSize: '12px'
        }}>
          {backendHealthy ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
              <span style={{ color: '#34d399', fontWeight: 600 }}>Backend Live</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} color="#f87171" />
              <span style={{ color: '#f87171', fontWeight: 600 }}>Connecting...</span>
            </>
          )}
        </div>

        <button
          onClick={onResetDemo}
          disabled={resetting}
          title="Reset demonstration state back to original baseline"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
          Reset Demo
        </button>
      </div>
    </header>
  );
};
