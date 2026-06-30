import { Clock } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { CardShell, HeaderRow } from '@/components/ui/CardShell';

export const XpCalendar: FC = () => {
  const { title, days, leadingBlanks } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekdaySunFirst = new Date(year, month, 1).getDay();
    return {
      title: `${monthName} ${year}`,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      leadingBlanks: (firstWeekdaySunFirst + 6) % 7,
    };
  }, []);

  return (
    <CardShell header={<HeaderRow icon={Clock} title={title} />}>
      <div
        className="grid grid-cols-7 text-white/45"
        style={{
          gap: 'clamp(0.2rem, 0.45vw, 0.4rem)',
          fontSize: 'clamp(0.6rem, 0.8vw, 0.72rem)',
          marginTop: 'clamp(0.75rem, 1vw, 1rem)',
          marginBottom: 'clamp(0.25rem, 0.5vw, 0.4rem)',
        }}
      >
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7"
        style={{ gap: 'clamp(0.2rem, 0.45vw, 0.4rem)' }}
      >
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center rounded-md text-white/85 tabular-nums"
            style={{
              fontSize: 'clamp(0.85rem, 1.15vw, 1.1rem)',
              aspectRatio: '1 / 1',
              minHeight: 'clamp(1.5rem, 3vw, 2.25rem)',
            }}
          >
            {day}
          </div>
        ))}
      </div>
      <div
        className="flex items-center text-white/55"
        style={{
          marginTop: 'clamp(0.5rem, 0.9vw, 0.75rem)',
          gap: 'clamp(0.75rem, 1.4vw, 1.25rem)',
          fontSize: 'clamp(0.65rem, 0.85vw, 0.78rem)',
        }}
      >
        <span>Current Streak: 0</span>
        <span>High Score: 0</span>
      </div>
    </CardShell>
  );
};
