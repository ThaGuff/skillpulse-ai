import { useState } from 'react';
import { C } from './theme';
import { PrimaryBtn, GhostBtn, Spinner } from './components';

export default function LessonModal({ skill, lesson, loading, error, onClose }) {
  const [answered, setAnswered] = useState(null);

  if (!skill) return null;

  const isCorrect = lesson && answered === lesson.quiz?.correct;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 150,
      animation: 'fadeIn 0.18s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 430,
        background: C.surface,
        borderRadius: '24px 24px 0 0',
        border: `1px solid ${C.border}`,
        padding: '24px 24px calc(36px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '90vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        animation: 'slideUp 0.26s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 3, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '36px 0' }}>
            <Spinner size={44} />
            <p style={{ fontSize: 14, color: C.muted, margin: 0, textAlign: 'center' }}>
              Generating your lesson on<br /><strong style={{ color: C.text }}>"{skill}"</strong>…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: C.danger, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>{error}</p>
            <GhostBtn onClick={onClose}>Close</GhostBtn>
          </div>
        )}

        {/* Lesson content */}
        {lesson && !loading && (
          <>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>5-MIN LESSON</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 14px', lineHeight: 1.25, fontFamily: 'Syne, sans-serif' }}>
              {lesson.title}
            </h3>

            {/* Hook */}
            <div style={{ background: C.accentLow, border: `1px solid ${C.accentMid}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: '0.1em' }}>DID YOU KNOW · </span>
              <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{lesson.hook}</span>
            </div>

            {/* Core concept */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700 }}>CORE CONCEPT</div>
              <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65, margin: 0 }}>{lesson.coreConcept}</p>
            </div>

            {/* Do this today */}
            <div style={{ background: C.card, borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700 }}>DO THIS TODAY</div>
              <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.5 }}>{lesson.practicalStep}</p>
            </div>

            {/* Quiz */}
            {lesson.quiz && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>QUICK CHECK</div>
                <p style={{ fontSize: 14, color: C.text, margin: '0 0 12px', fontWeight: 500, lineHeight: 1.4 }}>
                  {lesson.quiz.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(lesson.quiz.options || []).map((opt, i) => {
                    const letter = opt.charAt(0);
                    const isCorrectOpt = letter === lesson.quiz.correct;
                    const isSelected = answered === letter;
                    let bg = C.card, borderColor = C.border, color = C.textMid;
                    if (answered) {
                      if (isCorrectOpt)      { bg = 'rgba(0,232,122,0.10)'; borderColor = C.accent; color = C.accent; }
                      else if (isSelected)   { bg = 'rgba(255,85,85,0.08)'; borderColor = C.danger; color = C.danger; }
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => !answered && setAnswered(letter)}
                        style={{
                          background: bg,
                          border: `1.5px solid ${borderColor}`,
                          borderRadius: 10,
                          padding: '10px 14px',
                          textAlign: 'left',
                          cursor: answered ? 'default' : 'pointer',
                          fontSize: 13, color,
                          transition: 'all 0.18s',
                          fontFamily: 'DM Sans, sans-serif',
                          lineHeight: 1.4,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >{opt}</button>
                    );
                  })}
                </div>
                {answered && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px',
                    background: isCorrect ? 'rgba(0,232,122,0.07)' : 'rgba(255,85,85,0.07)',
                    borderRadius: 10,
                    border: `1px solid ${isCorrect ? C.accentMid : C.danger}`,
                  }}>
                    <span style={{ fontSize: 12, color: isCorrect ? C.accent : C.danger, fontWeight: 700 }}>
                      {isCorrect ? '✓ Correct! ' : '✗ Not quite. '}
                    </span>
                    <span style={{ fontSize: 12, color: C.textMid }}>{lesson.quiz.explanation}</span>
                  </div>
                )}
              </div>
            )}

            {/* Pro tip */}
            <div style={{ background: C.infoLow, border: `1px solid rgba(77,166,255,0.18)`, borderRadius: 12, padding: '12px 14px', marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: C.info, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700 }}>PRO TIP</div>
              <p style={{ fontSize: 13, color: C.textMid, margin: 0, lineHeight: 1.5 }}>{lesson.proTip}</p>
            </div>

            <PrimaryBtn onClick={onClose}>Done — back to my report</PrimaryBtn>
          </>
        )}
      </div>
    </div>
  );
}
