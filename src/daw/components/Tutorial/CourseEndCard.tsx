import { motion } from 'framer-motion';
import { ArrowRight, Check, GraduationCap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import type { TutorialCatalogEntry, TutorialCourse } from './tutorialCatalog';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── CourseEndCard ───────────────────────────────────────────────────────────
// What a course lesson ends on: it's done, where it sits in the course, and
// the way on. "Next: <title>" starts the next lesson on the same project,
// right where the student is (no navigation, no reset); "Back to the course"
// goes to the course's listing on the Studio dashboard; Done closes the card
// and leaves the student in the Studio. The course's last lesson ends the
// course instead.

export interface CourseEndCardProps {
  course: TutorialCourse;
  lesson: TutorialCatalogEntry;
  /** The lesson's place in the course, from 1. */
  number: number;
  total: number;
  next: TutorialCatalogEntry | null;
  onNext: () => void;
  onBackToCourse: () => void;
  onDone: () => void;
}

const pill = (primary: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: primary ? 700 : 600,
  borderRadius: 'var(--daw-radius-pill)',
  border: primary ? 'none' : '1px solid var(--daw-hairline)',
  background: primary ? 'var(--daw-primary)' : 'transparent',
  color: primary ? 'var(--daw-on-primary)' : 'var(--daw-text)',
  cursor: 'pointer',
});

export function CourseEndCard({
  course,
  lesson,
  number,
  total,
  next,
  onNext,
  onBackToCourse,
  onDone,
}: CourseEndCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.section
      aria-label="Lesson complete"
      data-testid="tutorial-end-card"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'fixed',
        left: '50%',
        top: '55%',
        translate: '-50% -50%',
        width: 400,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'auto',
        background: 'var(--daw-surface-1)',
        border: '1px solid var(--daw-hairline)',
        borderRadius: 'var(--daw-radius-lg)',
        boxShadow: 'var(--daw-shadow-modal)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 11px',
          borderBottom: '1px solid var(--daw-hairline)',
        }}
      >
        <GraduationCap size={16} style={{ color: 'var(--daw-accent)' }} />
        <span
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--daw-text)' }}
        >
          {course.title}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--daw-text-3)' }}>
          Lesson {number} of {total}
        </span>
        <button
          onClick={onDone}
          aria-label="Close"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 'var(--daw-radius-sm)',
            border: 'none',
            background: 'transparent',
            color: 'var(--daw-text-3)',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ height: 3, background: 'var(--daw-surface-2)' }}>
        <div
          style={{
            height: '100%',
            width: `${(number / Math.max(1, total)) * 100}%`,
            background: 'var(--daw-accent)',
          }}
        />
      </div>

      <div style={{ padding: '14px 16px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--daw-success)',
          }}
        >
          <Check size={14} aria-hidden />
          {next ? 'Lesson complete' : 'Course complete'}
        </div>
        <h2
          style={{
            margin: '6px 0 0',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--daw-text)',
          }}
        >
          {lesson.title}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--daw-text-2)',
          }}
        >
          {next
            ? 'Up next, right here on this song:'
            : `You finished every ${course.title} lesson. Nice work!`}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px 16px',
        }}
      >
        {next ? (
          <button onClick={onNext} style={pill(true)}>
            Next: {next.title} <ArrowRight size={15} />
          </button>
        ) : null}
        <button onClick={onBackToCourse} style={pill(!next)}>
          Back to the course
        </button>
        <button onClick={onDone} style={pill(false)}>
          Done
        </button>
      </div>
    </motion.section>
  );
}

/** "Back to the course" in the app: the course's listing, on the Production tab. */
export function useBackToCourse(): () => void {
  const navigate = useNavigate();
  return () => navigate(StudioRoutes.production());
}
