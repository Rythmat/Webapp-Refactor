export interface LockScreenProps {
  classroom: { id: string; name: string };
  teacherLabel: string;
}

export const LockScreen = ({ classroom, teacherLabel }: LockScreenProps) => (
  <div
    className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center"
    style={{ pointerEvents: 'none' }}
  >
    <div
      aria-hidden
      className="text-4xl font-medium tracking-wide text-white/85"
    >
      Music Atlas
    </div>
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-1 text-white"
    >
      <div className="text-2xl font-medium">{classroom.name}</div>
      <div className="text-base text-white/70">
        This device is locked by {teacherLabel}.
      </div>
    </div>
  </div>
);
