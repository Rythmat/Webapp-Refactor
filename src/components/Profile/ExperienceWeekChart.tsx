import React, { useMemo } from 'react';
import { useExperienceSummary } from '@/hooks/data/experience';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function getLastSevenDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getDayAbbrev(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return DAY_LABELS[d.getUTCDay()];
}

interface ChartPoint {
  date: string;
  label: string;
  xp: number;
}

const PADDING_LEFT = 0;
const PADDING_RIGHT = 0;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 28;

export const ExperienceWeekChart: React.FC = () => {
  const { data, isLoading } = useExperienceSummary();

  const points: ChartPoint[] = useMemo(() => {
    const days = getLastSevenDays();
    const timelineMap = new Map(
      (data?.timeline ?? []).map((row) => [row.date, row.totalExperience]),
    );
    return days.map((date) => ({
      date,
      label: getDayAbbrev(date),
      xp: timelineMap.get(date) ?? 0,
    }));
  }, [data?.timeline]);

  if (isLoading) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-xs"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Loading...
      </div>
    );
  }

  const xpValues = points.map((p) => p.xp);
  const baselineXp = points[0].xp;
  const maxXp = Math.max(...xpValues);
  const yRange = maxXp - baselineXp;

  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label="Experience earned over the past week"
    >
      <defs>
        <linearGradient id="xp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {(() => {
        const chartW = 400 - PADDING_LEFT - PADDING_RIGHT;
        const chartH = 200 - PADDING_TOP - PADDING_BOTTOM;
        const stepX = chartW / (points.length - 1);

        const toX = (i: number) => PADDING_LEFT + i * stepX;
        const toY = (xp: number) => {
          if (yRange === 0) return PADDING_TOP + chartH * 0.3;
          const ratio = (xp - baselineXp) / yRange;
          return PADDING_TOP + chartH * (1 - ratio);
        };

        const linePoints = points.map((p, i) => `${toX(i)},${toY(p.xp)}`).join(' ');

        const areaPoints = [
          `${toX(0)},${PADDING_TOP + chartH}`,
          ...points.map((p, i) => `${toX(i)},${toY(p.xp)}`),
          `${toX(points.length - 1)},${PADDING_TOP + chartH}`,
        ].join(' ');

        return (
          <>
            {/* Filled area */}
            <polygon points={areaPoints} fill="url(#xp-fill)" />

            {/* Line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={toX(i)}
                cy={toY(p.xp)}
                r="4"
                fill="var(--color-bg)"
                stroke="var(--color-accent)"
                strokeWidth="2"
              />
            ))}

            {/* X-axis day labels */}
            {points.map((p, i) => (
              <text
                key={p.date}
                x={toX(i)}
                y={200 - 4}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize="11"
                fontFamily="inherit"
              >
                {p.label}
              </text>
            ))}
          </>
        );
      })()}
    </svg>
  );
};
