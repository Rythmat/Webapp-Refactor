import { useMemo } from 'react';
import { RealTimeAnalytics } from '@/components/ui/real-time-analytics';
import { useExperienceSummary } from '@/hooks/data/experience';

const XP_LABELS = ['Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat', 'Sun'];

/**
 * XP tracker card — "Level · total · today" stats plus a two-week XP chart.
 * Extracted from the User page so the same progress surface can be reused on
 * the Learn hub (and anywhere else). Relies on `glass-panel-sm` /
 * `--color-border`, both provided by the settings-root and learn-root scopes.
 */
export const XpTrackerCard = () => {
  const { data: xpSummary } = useExperienceSummary();

  const { xpThisWeek, xpLastWeek } = useMemo(() => {
    const timelineMap = new Map(
      (xpSummary?.timeline ?? []).map((row) => [row.date, row.totalExperience]),
    );
    const days: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const toPoints = (dates: string[]) =>
      dates.map((date, i) => ({
        label: XP_LABELS[i] ?? '',
        value: timelineMap.get(date) ?? 0,
      }));
    return {
      xpThisWeek: toPoints(days.slice(7, 14)),
      xpLastWeek: toPoints(days.slice(0, 7)),
    };
  }, [xpSummary?.timeline]);

  const level = xpSummary?.level ?? 1;
  const totalXp = xpSummary?.totalExperience ?? 0;
  const todayXp = xpSummary?.today?.totalExperience ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-4">
        <h2 className="text-2xl font-medium text-white">XP</h2>
        <div className="flex gap-4 text-sm text-white/60">
          <span>
            Level {level} &middot; {totalXp.toLocaleString()} XP &middot;{' '}
            {todayXp} XP today
          </span>
        </div>
      </div>
      <div
        className="glass-panel-sm relative h-80 w-full rounded-3xl px-6 pb-2 pt-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <RealTimeAnalytics thisWeek={xpThisWeek} lastWeek={xpLastWeek} />
      </div>
    </section>
  );
};
