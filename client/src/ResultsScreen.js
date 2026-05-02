import { useState } from 'react';
import { C, urgencyMap } from './theme';
import { MetricCard, Pill, PrimaryBtn, GhostBtn } from './components';
import { generateLesson } from './api';
import LessonModal from './LessonModal';
import PaywallModal from './PaywallModal';

// ── Skill gap card ────────────────────────────────────────────────────────────
function GapCard({ gap, onLesson }) {
  const u = urgencyMap[gap.urgency] || urgencyMap.Medium;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '15px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>
            {gap.skill}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{gap.why}</div>
        </div>
        <Pill label={gap.urgency} color={u.color} bg={u.bg} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.08em', fontWeight: 600 }}>EARN BOOST</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, fontFamily: 'Syne, sans-serif', marginTop: 2 }}>
              {gap.earnBoost}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.08em', fontWeight: 600 }}>TIME TO LEARN</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'Syne, sans-serif', marginTop: 2 }}>
              {gap.timeToLearn}
            </div>
          </div>
        </div>
        <button
          onClick={() => onLesson(gap.skill)}
          style={{
            background: C.accentLow, border: `1px solid ${C.accentMid}`,
            color: C.accent, borderRadius: 10, padding: '7px 13px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Lesson →
        </button>
      </div>
    </div>
  );
}

// ── Main results screen ───────────────────────────────────────────────────────
export default function ResultsScreen({ analysis, answers, onRestart }) {
  const [lessonSkill, setLessonSkill] = useState(null);
  const [lesson, setLesson]           = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError]     = useState(null);
  const [showPaywall, setShowPaywall]     = useState(false);

  const riskColor = analysis.riskScore >= 7 ? C.danger
    : analysis.riskScore >= 4 ? C.warn
    : C.accent;

  // Check if user came back from successful Stripe checkout
  const subscribed = new URLSearchParams(window.location.search).get('subscribed');

  async function openLesson(skill) {
    setLessonSkill(skill);
    setLesson(null);
    setLessonError(null);
    setLessonLoading(true);
    try {
      const l = await generateLesson(skill, answers.role, answers.experience);
      setLesson(l);
    } catch (e) {
      setLessonError(e.message || 'Could not load lesson. Please try again.');
    } finally {
      setLessonLoading(false);
    }
  }

  function closeLesson() {
    setLessonSkill(null);
    setLesson(null);
    setLessonError(null);
  }

  const gap = (analysis.projectedMonthly || 0) - (analysis.currentMonthly || 0);
  const barPct = Math.min(
    Math.round(((analysis.currentMonthly || 1) / (analysis.projectedMonthly || 1)) * 100),
    72
  );

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px 40px', WebkitOverflowScrolling: 'touch' }}>

        {/* Subscribed banner */}
        {subscribed && (
          <div style={{ background: C.accentLow, border: `1px solid ${C.accentMid}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>🎉 Welcome to Pro! Your full plan is unlocked.</span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: C.accent, marginBottom: 8 }}>
            YOUR AI SKILL REPORT
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 8px', lineHeight: 1.25, fontFamily: 'Syne, sans-serif' }}>
            {analysis.headline}
          </h2>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>{analysis.summary}</p>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, animation: 'fadeUp 0.35s ease 0.05s both' }}>
          <MetricCard
            label="AI Risk Score"
            value={`${analysis.riskScore}/10`}
            sub={analysis.riskLabel}
            color={riskColor}
          />
          <MetricCard
            label="6-mo potential"
            value={`$${(analysis.projectedMonthly || 0).toLocaleString()}`}
            sub="if gaps closed"
            color={C.accent}
          />
        </div>

        {/* Income bar */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '15px', marginBottom: 20, animation: 'fadeUp 0.35s ease 0.10s both' }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>INCOME TRAJECTORY</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Now: ${(analysis.currentMonthly || 0).toLocaleString()}/mo</span>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Goal: ${(analysis.projectedMonthly || 0).toLocaleString()}/mo</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: `linear-gradient(90deg, ${C.accentMid}, ${C.accent})`,
              width: `${barPct}%`,
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>
            +${gap.toLocaleString()}/mo opportunity with the right skills
          </div>
        </div>

        {/* Skill gaps */}
        <div style={{ marginBottom: 20, animation: 'fadeUp 0.35s ease 0.15s both' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'Syne, sans-serif' }}>
            YOUR TOP SKILL GAPS
          </div>
          {(analysis.topGaps || []).map((gap, i) => (
            <GapCard key={i} gap={gap} onLesson={openLesson} />
          ))}
        </div>

        {/* Quick win */}
        <div style={{
          background: C.accentLow, border: `1.5px solid ${C.accentMid}`,
          borderRadius: 16, padding: '15px', marginBottom: 20,
          animation: 'fadeUp 0.35s ease 0.20s both',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.accent, marginBottom: 8 }}>
            THIS WEEK'S QUICK WIN
          </div>
          <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.6 }}>{analysis.quickWin}</p>
        </div>

        {/* 6-month roadmap */}
        {Array.isArray(analysis.sixMonthPlan) && analysis.sixMonthPlan.length > 0 && (
          <div style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease 0.25s both' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'Syne, sans-serif' }}>
              YOUR 6-MONTH ROADMAP
            </div>
            {analysis.sixMonthPlan.map((phase, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: 2 }} />
                  {i < analysis.sixMonthPlan.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: C.border, marginTop: 4, minHeight: 24 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 2 }}>{phase.month}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 2 }}>{phase.focus}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>→ {phase.milestone}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp 0.35s ease 0.30s both' }}>
          <PrimaryBtn onClick={() => setShowPaywall(true)}>
            Start my daily skill plan →
          </PrimaryBtn>
          <GhostBtn onClick={onRestart}>Retake the quiz</GhostBtn>
        </div>
      </div>

      {/* Lesson modal — rendered outside scroll so it can be fixed */}
      <LessonModal
        skill={lessonSkill}
        lesson={lesson}
        loading={lessonLoading}
        error={lessonError}
        onClose={closeLesson}
      />

      {/* Paywall modal */}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </>
  );
}
