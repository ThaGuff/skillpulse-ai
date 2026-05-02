import { C, ROLES, CONCERNS, EXPERIENCE, INCOME_RANGES, HOURS } from './theme';
import { ProgressBar, SelectCard, PrimaryBtn, BackBtn } from './components';

/**
 * QuizShell — the structural wrapper used by every step.
 *
 * Layout (top → bottom, fixed height):
 *   ProgressBar        — flexShrink:0
 *   Scroll region      — flex:1, overflowY:auto  ← only this scrolls
 *   CTA button area    — flexShrink:0            ← always visible
 *
 * This is the fix for the "button hidden" bug: the button lives
 * OUTSIDE the scroll container, so it can never be pushed off-screen.
 */
function QuizShell({ step, total, title, subtitle, onBack, children, cta, ctaDisabled, onCta }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* 1. Progress — never scrolls */}
      <ProgressBar step={step} total={total} />

      {/* 2. Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 24px 0', WebkitOverflowScrolling: 'touch' }}>
        {onBack && <BackBtn onClick={onBack} />}

        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 6px', lineHeight: 1.2, fontFamily: 'Syne, sans-serif' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>{subtitle}</p>
        )}

        {/* Card list — never inside a flex:1 wrapper so it doesn't compete with the button */}
        {children}

        {/* Bottom breathing room so last card isn't flush against scroll edge */}
        <div style={{ height: 8 }} />
      </div>

      {/* 3. CTA — never scrolls, always visible */}
      <div style={{ flexShrink: 0, padding: '14px 24px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
        <PrimaryBtn onClick={onCta} disabled={ctaDisabled}>{cta}</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Step 1: Role ─────────────────────────────────────────────────────────────
export function Step1Role({ answers, setAnswers, onNext }) {
  return (
    <QuizShell
      step={1} total={5}
      title="What's your main gig?"
      subtitle="Pick the role that fits you best."
      cta="Continue →"
      ctaDisabled={!answers.role}
      onCta={onNext}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ROLES.map(r => (
          <SelectCard
            key={r.id}
            selected={answers.role === r.id}
            onClick={() => setAnswers(a => ({ ...a, role: r.id }))}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{r.label}</span>
          </SelectCard>
        ))}
      </div>
    </QuizShell>
  );
}

// ── Step 2: Experience ───────────────────────────────────────────────────────
export function Step2Experience({ answers, setAnswers, onNext, onBack }) {
  return (
    <QuizShell
      step={2} total={5}
      title="How long have you been doing this?"
      onBack={onBack}
      cta="Continue →"
      ctaDisabled={!answers.experience}
      onCta={onNext}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EXPERIENCE.map(e => (
          <SelectCard
            key={e.id}
            selected={answers.experience === e.id}
            onClick={() => setAnswers(a => ({ ...a, experience: e.id }))}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Syne, sans-serif' }}>{e.label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{e.sub}</div>
            </div>
          </SelectCard>
        ))}
      </div>
    </QuizShell>
  );
}

// ── Step 3: Concerns ─────────────────────────────────────────────────────────
export function Step3Concerns({ answers, setAnswers, onNext, onBack }) {
  function toggle(id) {
    setAnswers(a => ({
      ...a,
      concerns: a.concerns.includes(id)
        ? a.concerns.filter(c => c !== id)
        : [...a.concerns, id],
    }));
  }

  return (
    <QuizShell
      step={3} total={5}
      title="What worries you most?"
      subtitle="Select all that apply."
      onBack={onBack}
      cta="Continue →"
      ctaDisabled={answers.concerns.length === 0}
      onCta={onNext}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CONCERNS.map(c => (
          <SelectCard
            key={c.id}
            selected={answers.concerns.includes(c.id)}
            onClick={() => toggle(c.id)}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{c.label}</span>
          </SelectCard>
        ))}
      </div>
    </QuizShell>
  );
}

// ── Step 4: Income ───────────────────────────────────────────────────────────
// FIX: renders INCOME_RANGES exactly once — no duplicate rendering.
export function Step4Income({ answers, setAnswers, onNext, onBack }) {
  return (
    <QuizShell
      step={4} total={5}
      title="What do you earn right now?"
      subtitle="Rough monthly estimate — helps us set real targets."
      onBack={onBack}
      cta="Continue →"
      ctaDisabled={!answers.income}
      onCta={onNext}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {INCOME_RANGES.map(r => (
          <SelectCard
            key={r.id}
            selected={answers.income === r.id}
            onClick={() => setAnswers(a => ({ ...a, income: r.id }))}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.label}</span>
          </SelectCard>
        ))}
      </div>
    </QuizShell>
  );
}

// ── Step 5: Hours ────────────────────────────────────────────────────────────
export function Step5Hours({ answers, setAnswers, onAnalyze, onBack }) {
  return (
    <QuizShell
      step={5} total={5}
      title="How much time can you spare?"
      subtitle="For learning. Small is totally fine."
      onBack={onBack}
      cta="Analyze my gaps ⚡"
      ctaDisabled={!answers.hours}
      onCta={onAnalyze}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HOURS.map(h => (
          <SelectCard
            key={h.id}
            selected={answers.hours === h.id}
            onClick={() => setAnswers(a => ({ ...a, hours: h.id }))}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Syne, sans-serif' }}>{h.label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{h.sub}</div>
            </div>
          </SelectCard>
        ))}
      </div>
    </QuizShell>
  );
}
