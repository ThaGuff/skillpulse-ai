import { useState } from 'react';
import { C } from './theme';
import { PrimaryBtn, GhostBtn } from './components';
import { createCheckoutSession } from './api';

const PERKS = [
  '⚡ Unlimited AI skill analyses',
  '📚 Daily 5-min personalized lessons',
  '🔥 Streak tracking + accountability',
  '📈 Income progress dashboard',
  '🎯 New lesson packs every week',
  '🏆 Shareable skill certificates',
];

export default function PaywallModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const url = await createCheckoutSession(email || undefined);
      window.location.href = url;
    } catch (e) {
      // If Stripe isn't configured, show a coming soon message
      if (e.message.includes('not configured') || e.message.includes('STRIPE')) {
        setError('Payments coming soon! Drop your email below and we\'ll notify you when Pro launches.');
      } else {
        setError(e.message || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 430,
        background: C.surface,
        borderRadius: '24px 24px 0 0',
        border: `1px solid ${C.border}`,
        padding: '24px 24px calc(32px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: '0 auto 22px' }} />

        {/* Badge */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: C.accent, background: C.accentLow, padding: '4px 12px', borderRadius: 20 }}>
            SKILLPULSE PRO
          </span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, textAlign: 'center', margin: '0 0 6px', fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>
          Turn your gaps into<br />recurring income
        </h2>
        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
          7-day free trial, then $7.99/mo. Cancel anytime.
        </p>

        {/* Perks */}
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '4px 16px', marginBottom: 20 }}>
          {PERKS.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderBottom: i < PERKS.length - 1 ? `1px solid ${C.border}` : 'none',
              fontSize: 13, color: C.text,
            }}>
              {p}
            </div>
          ))}
        </div>

        {/* Pricing callout */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'baseline', marginBottom: 20 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: C.accent, fontFamily: 'Syne, sans-serif' }}>$7.99</span>
          <span style={{ fontSize: 14, color: C.muted }}>/month after trial</span>
        </div>

        {/* Email (optional) */}
        <input
          type="email"
          placeholder="Email (optional — for receipt)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '13px 14px', marginBottom: 10,
            background: C.card, border: `1px solid ${C.borderMid}`,
            borderRadius: 12, fontSize: 14, color: C.text,
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: error.includes('coming soon') ? C.accent : C.danger, marginBottom: 10, lineHeight: 1.4, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <PrimaryBtn onClick={handleCheckout} loading={loading}>
          {loading ? 'Redirecting to checkout…' : 'Start 7-day free trial →'}
        </PrimaryBtn>

        <div style={{ marginTop: 10 }}>
          <GhostBtn onClick={onClose}>Maybe later</GhostBtn>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
          🔒 Secure checkout via Stripe. No hidden fees.
        </p>
      </div>
    </div>
  );
}
