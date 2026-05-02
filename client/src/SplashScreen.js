import { C } from './theme';
import { PrimaryBtn } from './components';

const FEATURES = [
  { icon: '⚡', title: 'AI skill gap scanner',   desc: 'See exactly what\'s costing you clients and cash' },
  { icon: '📈', title: 'Income-linked roadmap',  desc: 'Skills ranked by earning potential, not hype'    },
  { icon: '🔥', title: 'Daily 5-min lessons',    desc: 'Build the habit before someone takes your spot'  },
];

export default function SplashScreen({ onStart }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px env(safe-area-inset-bottom, 32px)',
      overflowY: 'auto',
    }}>
      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>

        {/* Pulsing logo */}
        <div style={{ position: 'relative', width: 88, height: 88 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${C.accent}`, animation: 'pulseRing 2.4s ease-out infinite' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${C.accent}`, animation: 'pulseRing 2.4s ease-out infinite 0.6s' }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: C.accentLow, border: `1.5px solid ${C.accentHi}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          }}>⚡</div>
        </div>

        {/* Copy */}
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s ease 0.15s both' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: C.accent, marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>
            SKILLPULSE AI
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: '0 0 12px', lineHeight: 1.15, fontFamily: 'Syne, sans-serif' }}>
            Know exactly<br />what to learn next
          </h1>
          <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65, margin: 0, maxWidth: 290, marginInline: 'auto' }}>
            AI scans your skill gaps and builds a personalized income roadmap — before someone else fills your spot.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ width: '100%', background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden', animation: 'fadeUp 0.5s ease 0.3s both' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '14px 18px',
              borderBottom: i < FEATURES.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1.4, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2, fontFamily: 'Syne, sans-serif' }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA pinned at bottom */}
      <div style={{ flexShrink: 0, paddingTop: 24, animation: 'fadeUp 0.5s ease 0.45s both' }}>
        <PrimaryBtn onClick={onStart}>Scan my skill gaps →</PrimaryBtn>
        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, margin: '10px 0 0' }}>
          Free · 90 seconds · No sign-up needed
        </p>
      </div>
    </div>
  );
}
