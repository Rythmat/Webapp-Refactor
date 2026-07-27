/* eslint-disable tailwindcss/classnames-order */
import { useState } from 'react';
import { ChevronDown, ChevronRight, GraduationCap, Check } from 'lucide-react';
import { useStore } from '@/daw/store';
import { TUTORIALS } from '@/daw/components/Tutorial/tutorials';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

// ── LessonPicker ────────────────────────────────────────────────────────────
// Collapsible "Lessons" section rendered at the top of the Library tab (above
// Templates). Each row starts a step-by-step Studio tutorial.

export function LessonPicker() {
  const [open, setOpen] = useState(true);
  const startTutorial = useStore((s) => s.startTutorial);
  const activeTutorialId = useStore((s) => s.activeTutorialId);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
        style={{
          color: 'var(--color-text-dim)',
          background: 'none',
          border: 'none',
        }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <GraduationCap
          size={11}
          style={{
            marginLeft: 4,
            marginRight: 3,
            color: 'var(--color-accent)',
          }}
        />
        <span>Lessons</span>
      </button>

      {open && (
        <div style={{ padding: '2px 8px 8px' }}>
          {TUTORIALS.map((t) => {
            const done = completedAt[t.id] != null;
            const active = activeTutorialId === t.id;
            return (
              <div
                key={t.id}
                className="rounded-lg mb-1.5"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  padding: 8,
                }}
              >
                <div className="flex items-start gap-1.5">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--color-text)', lineHeight: 1.3 }}
                  >
                    {t.title}
                  </span>
                  {done && (
                    <Check
                      size={11}
                      style={{
                        color: 'var(--color-accent)',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                  )}
                </div>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--color-text-dim)', lineHeight: 1.35 }}
                >
                  {t.subtitle}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {t.difficulty} · {t.estMinutes} min
                  </span>
                  <button
                    onClick={() => startTutorial(t.id)}
                    className="text-[10px] font-semibold rounded px-2 py-0.5 cursor-pointer"
                    style={{
                      background: active
                        ? 'var(--color-surface-3)'
                        : 'var(--color-accent)',
                      color: active ? 'var(--color-text)' : '#fff',
                      border: 'none',
                    }}
                  >
                    {active ? 'In progress' : done ? 'Replay' : 'Start'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
