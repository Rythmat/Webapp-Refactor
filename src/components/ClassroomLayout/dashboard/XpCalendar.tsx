import { Clock } from 'lucide-react';
import { useMemo, type FC } from 'react';

export const XpCalendar: FC = () => {
  const { title, days } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      title: `XP in ${monthName}`,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    };
  }, []);

  return (
    <div
      className="glass-panel-sm flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(26, 26, 26, 0.7)',
        padding: 'clamp(0.85rem, 1.3vw, 1.5rem)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Clock
          className="text-white/85"
          style={{
            width: 'clamp(0.95rem, 1.25vw, 1.15rem)',
            height: 'clamp(0.95rem, 1.25vw, 1.15rem)',
          }}
        />
        <span
          className="font-medium text-white"
          style={{ fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' }}
        >
          {title}
        </span>
      </div>
      <div
        className="grid flex-1 grid-cols-7 auto-rows-fr"
        style={{ gap: 'clamp(0.2rem, 0.45vw, 0.4rem)' }}
      >
        {days.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center rounded-md text-white/85 tabular-nums"
            style={{ fontSize: 'clamp(0.85rem, 1.15vw, 1.1rem)' }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};
