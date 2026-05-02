import { C } from './theme';
import { PrimaryBtn } from './components';

export default function ErrorScreen({ message, onRetry }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: 'Syne, sans-serif', margin: 0 }}>
        Analysis failed
      </h3>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px', maxWidth: 300, width: '100%' }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>{message}</p>
      </div>
      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>
        Make sure <strong style={{ color: C.textMid }}>ANTHROPIC_API_KEY</strong><br />
        is set in your Railway environment variables.
      </p>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <PrimaryBtn onClick={onRetry}>Try again</PrimaryBtn>
      </div>
    </div>
  );
}
