import { useState, useEffect } from 'react';
import { C } from './theme';
import { Spinner } from './components';

const STEPS = [
  'Matching your role to market demand',
  'Calculating AI displacement risk',
  'Finding highest-ROI skill gaps',
  'Projecting your income potential',
  'Building your personalized roadmap',
];

export default function LoadingScreen() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setActive(i), i * 950)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 32,
    }}>
      {/* Orb */}
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0,232,122,0.18) 0%, transparent 70%)`,
          animation: 'glowPulse 1.8s ease-in-out infinite',
        }} />
        <div style={{ position: 'absolute', inset: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={60} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
          ⚡
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>
          Scanning your gaps
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          AI is analyzing market demand<br />and your income potential
        </div>
      </div>

      {/* Step tracker */}
      <div style={{ width: '100%', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '11px 16px',
            borderBottom: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: i <= active ? C.accent : C.border,
              boxShadow: i <= active ? `0 0 8px ${C.accentHi}` : 'none',
              transition: 'background 0.35s ease, box-shadow 0.35s ease',
            }} />
            <span style={{
              fontSize: 12,
              color: i <= active ? C.text : C.muted,
              fontWeight: i <= active ? 500 : 400,
              transition: 'color 0.35s ease',
            }}>{s}</span>
            {i < active && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: C.accent, animation: 'tickIn 0.2s ease' }}>✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
