import React from 'react';
import type { MobilityProfile } from '../types';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
  profile: MobilityProfile;
  onChange: (profile: MobilityProfile) => void;
}

const PRESET_PROFILES: Record<string, MobilityProfile> = {
  STANDARD_WHEELCHAIR: {
    profile_id: 'STANDARD_WHEELCHAIR',
    name: 'Manual Wheelchair',
    min_clear_width_m: 0.9,
    max_slope_pct: 6.0,
    require_kerb_ramps: true,
    avoid_stairs: true,
    avoid_cobblestone: true,
    description: 'Requires dropped curbs, continuous ramp grades <= 6%, and min 90cm passage.'
  },
  POWER_WHEELCHAIR: {
    profile_id: 'POWER_WHEELCHAIR',
    name: 'Power / Electric Chair',
    min_clear_width_m: 0.85,
    max_slope_pct: 10.0,
    require_kerb_ramps: true,
    avoid_stairs: true,
    avoid_cobblestone: false,
    description: 'Can manage inclines up to 10% with motorized torque, but requires curb ramps.'
  },
  WALKING_FRAME: {
    profile_id: 'WALKING_FRAME',
    name: 'Walking Frame / Rollator',
    min_clear_width_m: 0.75,
    max_slope_pct: 7.5,
    require_kerb_ramps: false,
    avoid_stairs: true,
    avoid_cobblestone: true,
    description: 'Requires smooth surfaces and zero stairs; can step over low 2cm thresholds.'
  },
  STROLLER: {
    profile_id: 'STROLLER',
    name: 'Stroller / Family',
    min_clear_width_m: 0.8,
    max_slope_pct: 8.0,
    require_kerb_ramps: true,
    avoid_stairs: true,
    avoid_cobblestone: false,
    description: 'Avoids stairways, prefers curb cuts and continuous sidewalk ramps.'
  }
};

export const MobilityProfileSelector: React.FC<Props> = ({ profile, onChange }) => {
  const [isCustom, setIsCustom] = React.useState(profile.profile_id === 'CUSTOM');

  const selectPreset = (presetKey: string) => {
    setIsCustom(false);
    onChange(PRESET_PROFILES[presetKey]);
  };

  const updateCustom = (field: keyof MobilityProfile, value: any) => {
    setIsCustom(true);
    onChange({
      ...profile,
      profile_id: 'CUSTOM',
      name: 'Custom Profile',
      [field]: value
    });
  };

  return (
    <div className="card" style={{ padding: '14px', background: '#0b162c' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Mobility Profile & Constraints
        </h4>
        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
          {profile.name}
        </span>
      </div>

      {/* Preset Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
        {Object.entries(PRESET_PROFILES).map(([key, p]) => {
          const selected = !isCustom && profile.profile_id === key;
          return (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              style={{
                background: selected ? 'rgba(6, 182, 212, 0.2)' : '#0f1d36',
                border: selected ? '1px solid #06b6d4' : '1px solid #1e293b',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: selected ? '#38bdf8' : '#e2e8f0' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Max {p.max_slope_pct}% • {p.min_clear_width_m}m
              </div>
            </button>
          );
        })}
      </div>

      {/* Constraint Details & Sliders */}
      <div style={{ background: '#091224', padding: '10px', borderRadius: '8px', border: '1px solid #1a2744' }}>
        {/* Min Width */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ color: '#94a3b8' }}>Min. Clear Width:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{profile.min_clear_width_m.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.5"
            step="0.05"
            value={profile.min_clear_width_m}
            onChange={(e) => updateCustom('min_clear_width_m', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#06b6d4' }}
          />
        </div>

        {/* Max Slope */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ color: '#94a3b8' }}>Max. Slope / Grade:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{profile.max_slope_pct.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="3.0"
            max="14.0"
            step="0.5"
            value={profile.max_slope_pct}
            onChange={(e) => updateCustom('max_slope_pct', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#06b6d4' }}
          />
        </div>

        {/* Checkbox Constraints */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}
            onClick={() => updateCustom('require_kerb_ramps', !profile.require_kerb_ramps)}
          >
            {profile.require_kerb_ramps ? <CheckSquare size={14} color="#06b6d4" /> : <Square size={14} color="#64748b" />}
            Require Dropped Kerbs
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}
            onClick={() => updateCustom('avoid_stairs', !profile.avoid_stairs)}
          >
            {profile.avoid_stairs ? <CheckSquare size={14} color="#06b6d4" /> : <Square size={14} color="#64748b" />}
            Strict No Stairs
          </label>
        </div>
      </div>
    </div>
  );
};
