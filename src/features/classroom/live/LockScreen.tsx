import { Lock } from 'lucide-react';

export interface LockScreenProps {
  classroom: { id: string; name: string };
  teacherLabel: string;
}

/**
 * A student's device while the teacher has locked screens: eyes up front.
 * Nothing on it can be pressed (the page underneath keeps its state).
 */
export const LockScreen = ({ classroom, teacherLabel }: LockScreenProps) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0b0b0d] px-8 text-center"
    style={{ pointerEvents: 'none' }}
  >
    <span
      aria-hidden
      className="flex size-16 items-center justify-center rounded-full bg-white/[0.06] text-white/80"
    >
      <Lock className="size-7" strokeWidth={1.75} />
    </span>
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2 text-white"
    >
      <div className="text-[clamp(1.75rem,4vw,2.75rem)] font-normal tracking-[-0.02em]">
        Eyes up front
      </div>
      <div className="text-lg text-white/60">Mira al frente</div>
      <div className="mt-2 text-base text-white/55">
        {classroom.name} · This device is locked by {teacherLabel}.
      </div>
    </div>
  </div>
);
