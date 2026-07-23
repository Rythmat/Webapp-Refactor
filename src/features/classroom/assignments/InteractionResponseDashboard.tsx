/**
 * Teacher-only interaction response dashboard. Belt-and-suspenders role guard
 * so a student who navigates directly to the progress URL never sees this.
 */
import { useEffect, useRef } from 'react';
import { useMe } from '@/hooks/data';
import type { ResponseAggregate } from './buildResponseAggregate';

export interface InteractionResponseDashboardProps {
  aggregate: ResponseAggregate[];
}

export const InteractionResponseDashboard = ({
  aggregate,
}: InteractionResponseDashboardProps) => {
  const { data: me } = useMe();
  if (me?.role && me.role !== 'teacher' && me.role !== 'admin') {
    return null;
  }

  if (aggregate.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center text-sm text-white/60">
        No interactions attached to this assignment.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {aggregate.map((a) => (
        <AggregateCard key={a.interactionId} aggregate={a} />
      ))}
    </div>
  );
};

const AggregateCard = ({ aggregate }: { aggregate: ResponseAggregate }) => (
  <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
    <header className="flex flex-wrap items-baseline justify-between gap-3">
      <h3 className="text-base font-medium text-white">
        {aggregate.question.en}
      </h3>
      <span className="text-xs text-white/50">
        {aggregate.totalRespondents} respondent(s)
        {aggregate.mismatched > 0 && (
          <span className="ml-2 text-amber-200/80">
            · {aggregate.mismatched} hidden (type mismatch)
          </span>
        )}
      </span>
    </header>
    <AggregateBody aggregate={aggregate} />
  </section>
);

const AggregateBody = ({ aggregate }: { aggregate: ResponseAggregate }) => {
  switch (aggregate.kind) {
    case 'choice':
      return <ChoiceBody aggregate={aggregate} />;
    case 'text':
      return <TextBody aggregate={aggregate} />;
    case 'number':
      return <NumberBody aggregate={aggregate} />;
    case 'draw':
      return <DrawBody aggregate={aggregate} />;
    case 'check-in':
      return <CheckInBody aggregate={aggregate} />;
    case 'atlas':
      return <AtlasBody aggregate={aggregate} />;
    case 'showcase':
      return <ShowcaseBody aggregate={aggregate} />;
  }
};

const ShowcaseBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'showcase' }>;
}) => {
  if (aggregate.offers.length === 0)
    return <EmptyRow label="No projects offered yet." />;
  return (
    <ul className="flex flex-col gap-2">
      {aggregate.offers.map((o) => (
        <li
          key={o.enrollmentId}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/80"
        >
          <span className="truncate">{o.displayName}</span>
          <span className="truncate text-xs text-white/50">
            {o.artifact.name}
          </span>
        </li>
      ))}
    </ul>
  );
};

const EmptyRow = ({ label }: { label: string }) => (
  <p className="text-sm text-white/50">{label}</p>
);

const ChoiceBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'choice' }>;
}) => {
  if (aggregate.totalRespondents === 0)
    return <EmptyRow label="No responses yet." />;
  return (
    <ul className="flex flex-col gap-2">
      {aggregate.options.map((opt) => (
        <li key={opt.index} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{opt.label.en}</span>
            <span className="text-xs text-white/50">
              {opt.count} · {Math.round(opt.percent)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full bg-white/60"
              style={{ width: `${opt.percent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

const TextBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'text' }>;
}) => {
  if (aggregate.answers.length === 0)
    return <EmptyRow label="No text responses yet." />;
  return (
    <ul className="flex flex-col gap-2">
      {aggregate.answers.map((answer, i) => (
        <li
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/80"
        >
          <blockquote>{answer}</blockquote>
        </li>
      ))}
    </ul>
  );
};

const NumberBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'number' }>;
}) => {
  if (aggregate.totalRespondents === 0 || aggregate.buckets.length === 0)
    return <EmptyRow label="No number responses yet." />;
  const height = 100;
  const maxCount = Math.max(...aggregate.buckets.map((b) => b.count), 1);
  const barW = 24;
  const gap = 4;
  const width = aggregate.buckets.length * (barW + gap);
  return (
    <svg width={width} height={height + 20}>
      {aggregate.buckets.map((b, i) => {
        const h = (b.count / maxCount) * height;
        return (
          <g key={i} transform={`translate(${i * (barW + gap)}, 0)`}>
            <rect
              y={height - h}
              width={barW}
              height={h}
              className="fill-white/60"
            />
            <text
              x={barW / 2}
              y={height + 12}
              textAnchor="middle"
              className="fill-white/50 text-[10px]"
            >
              {b.from}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const DrawBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'draw' }>;
}) => {
  if (aggregate.skipped === 'too_many_strokes')
    return <EmptyRow label="Too many strokes to preview." />;
  if (aggregate.skipped === 'too_large')
    return <EmptyRow label="Drawings too large to preview." />;
  if (aggregate.thumbnails.length === 0)
    return <EmptyRow label="No drawings yet." />;
  return (
    <>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {aggregate.thumbnails.map((t) => (
          <DrawThumbnail key={t.enrollmentId} strokes={t.strokes} />
        ))}
      </div>
      {aggregate.skipped === 'thumbnail_cap' && (
        <p className="mt-2 text-xs text-white/50">
          Showing first {aggregate.thumbnails.length} drawings.
        </p>
      )}
    </>
  );
};

interface StrokePoint {
  x?: number;
  y?: number;
}

const SIZE = 96;
const MAX_POINTS = 500;

const DrawThumbnail = ({
  strokes,
}: {
  strokes: Array<Record<string, unknown>>;
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    for (const stroke of strokes) {
      const points = (stroke as { points?: StrokePoint[] }).points;
      if (!Array.isArray(points) || points.length < 2) continue;
      const clamped = points.slice(0, MAX_POINTS);
      ctx.beginPath();
      const p0 = clamped[0];
      ctx.moveTo(clampCoord(p0.x), clampCoord(p0.y));
      for (let i = 1; i < clamped.length; i++) {
        const p = clamped[i];
        ctx.lineTo(clampCoord(p.x), clampCoord(p.y));
      }
      ctx.stroke();
    }
  }, [strokes]);
  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      className="rounded-lg border border-white/[0.06] bg-black/40"
    />
  );
};

const clampCoord = (v: number | undefined): number => {
  if (typeof v !== 'number' || Number.isNaN(v)) return SIZE / 2;
  if (v < 0) return 0;
  if (v > SIZE) return SIZE;
  return v;
};

const CheckInBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'check-in' }>;
}) => {
  if (aggregate.rows.length === 0)
    return <EmptyRow label="No check-ins yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-amber-500/20 bg-amber-500/[0.06]">
      <div className="px-3 py-1.5 text-xs uppercase tracking-wide text-amber-200/80">
        Teacher only — do not project
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-white/40">
          <tr>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Response</th>
          </tr>
        </thead>
        <tbody>
          {aggregate.rows.map((r) => (
            <tr
              key={r.enrollmentId}
              className="border-t border-white/[0.06] text-white/80"
            >
              <td className="px-3 py-2">{r.displayName}</td>
              <td className="px-3 py-2">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AtlasBody = ({
  aggregate,
}: {
  aggregate: Extract<ResponseAggregate, { kind: 'atlas' }>;
}) => {
  if (aggregate.results.length === 0)
    return <EmptyRow label="No results submitted yet." />;
  return (
    <ul className="flex flex-col gap-2">
      {aggregate.results.map((r) => (
        <li
          key={r.enrollmentId}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/80"
        >
          <details>
            <summary className="cursor-pointer">{r.displayName}</summary>
            <pre className="mt-2 overflow-x-auto text-xs text-white/60">
              {JSON.stringify(r.result, null, 2)}
            </pre>
          </details>
        </li>
      ))}
    </ul>
  );
};
