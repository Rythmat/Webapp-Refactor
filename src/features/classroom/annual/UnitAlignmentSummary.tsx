/**
 * UnitAlignmentSummary — the per-unit Standards Alignment panel. Aggregates the
 * standards / anchors / SEL / CLOs / activities (+ IMPACT, gated) the unit's
 * Days touch, with a Google-Classroom-style coverage color (well-covered /
 * light / uncovered by density). "Print summary" opens an Atlas-branded page
 * a teacher can hand an evaluator. Teacher-only aggregation of cell rationale —
 * zero firewall interaction.
 */
import { BarChart3, ChevronDown, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useActivityBank, useCloBank } from '../content/hooks';
import { cloLabel } from '../plan/LearningGoalPicker';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { Day } from '../types';
import {
  alignmentIsEmpty,
  buildUnitAlignment,
  type AlignmentCount,
  type UnitAlignment,
} from './unitAlignment';

interface UnitAlignmentSummaryProps {
  unitLabel: string;
  days: Day[];
}

const coverageColor = (count: number, max: number): string => {
  if (max <= 0) return 'rgba(255,255,255,0.2)';
  const ratio = count / max;
  if (ratio >= 0.66) return '#34d399'; // emerald — well covered
  if (ratio >= 0.33) return '#fbbf24'; // amber — moderate
  return '#f87171'; // red — light
};

const Group = ({
  title,
  items,
}: {
  title: string;
  items: AlignmentCount[];
}) => {
  if (items.length === 0) return null;
  const max = items[0]?.count ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-white/40">
        {title}
      </span>
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: coverageColor(it.count, max) }}
              title={`${it.count} day${it.count === 1 ? '' : 's'}`}
            />
            <span className="flex-1 text-white/70">{it.label}</span>
            <span className="shrink-0 text-white/40">{it.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const printAlignment = (unitLabel: string, a: UnitAlignment) => {
  const section = (title: string, items: AlignmentCount[]) =>
    items.length
      ? `<h2>${esc(title)}</h2><ul>${items
          .map((i) => `<li>${esc(i.label)} <span>×${i.count}</span></li>`)
          .join('')}</ul>`
      : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Standards Alignment — ${esc(unitLabel)}</title>
    <style>
      body{font-family:Georgia,serif;color:#1a1a1a;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}
      header{border-bottom:2px solid #1a1a1a;padding-bottom:8px;margin-bottom:16px}
      .brand{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#666}
      h1{font-size:24px;margin:4px 0}
      h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#444;margin:18px 0 6px}
      ul{margin:0;padding-left:18px}
      li{margin:2px 0}
      li span{color:#888;font-size:12px}
      .meta{color:#666;font-size:13px}
    </style></head><body>
    <header><div class="brand">Atlas Classroom — Standards Alignment</div>
    <h1>${esc(unitLabel)}</h1>
    <div class="meta">${a.dayCount} day${a.dayCount === 1 ? '' : 's'} · generated from the lesson plan</div></header>
    ${section('Standards', a.standards)}
    ${section('Common Anchors', a.commonAnchors)}
    ${section('SEL competencies', a.selCompetencies)}
    ${section('Learning objectives', a.clos)}
    ${section('Activities', a.activities)}
    ${section('IMPACT values', a.impactTags)}
    </body></html>`;
  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};

export const UnitAlignmentSummary = ({
  unitLabel,
  days,
}: UnitAlignmentSummaryProps) => {
  const { byId: cloById } = useCloBank();
  const { byId: activityById } = useActivityBank();
  const { config } = useTeacherConfig();
  const [open, setOpen] = useState(false);

  const alignment = useMemo(
    () =>
      buildUnitAlignment(days, {
        impactVisible: config.impactVisible,
        resolveClo: cloById,
        resolveActivity: activityById,
        cloLabel,
      }),
    [days, config.impactVisible, cloById, activityById],
  );

  if (alignmentIsEmpty(alignment)) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <BarChart3 className="h-4 w-4" />
          Standards Alignment
          <span className="text-white/40">
            ({alignment.standards.length} standards · {alignment.clos.length}{' '}
            objectives)
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => printAlignment(unitLabel, alignment)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/25 hover:text-white"
        >
          <Printer className="h-3.5 w-3.5" />
          Print summary
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-3 md:grid-cols-2">
          <Group title="Standards" items={alignment.standards} />
          <Group title="Learning objectives" items={alignment.clos} />
          <Group title="Common Anchors" items={alignment.commonAnchors} />
          <Group title="SEL competencies" items={alignment.selCompetencies} />
          <Group title="Activities" items={alignment.activities} />
          {config.impactVisible && (
            <Group title="IMPACT values" items={alignment.impactTags} />
          )}
        </div>
      )}
    </section>
  );
};
