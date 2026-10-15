/* eslint-disable react/jsx-sort-props */
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  LESSON_STYLES,
  type LessonStyle,
} from '@/curriculum/data/lessonStyles';
import { type Band, variationForStyle } from '@/curriculum/engine/band/band';
import type {
  LessonPairing,
  PairingOverride,
} from '@/curriculum/engine/lessonPairings/registry';
import { CONSOLE_LABEL } from '../ui/styles';
import { CAN_WRITE_FILES, savePairing } from './bandFiles';
import { useBandList, usePairingList } from './bandSession';

/**
 * Where a band plays in lessons. A band is assigned to a lesson style — a
 * genre · level · style chunk of steps — and plays every play-along step in
 * it and its Practice Track, so one click covers the whole run of activities.
 * An exception gives a section, or some steps, another band where the lesson
 * genuinely changes inside the style.
 *
 * A band with variations plays, in a style, the variation made for it unless
 * the style names another; an exception can name a band's variation too.
 */

const SECTIONS = ['A', 'B', 'C', 'D'];

/** "3, 4, 7–9" → [3, 4, 7, 8, 9]; empty for every step. */
export function parseSteps(text: string): number[] {
  const out: number[] = [];
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:[-–](\d+))?$/.exec(part);
    if (!m) continue;
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let n = Math.min(from, to); n <= Math.max(from, to); n++) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** [3, 4, 7, 8, 9] → "3–4, 7–9". */
export function stepsLabel(steps: readonly number[]): string {
  const runs: string[] = [];
  let start = steps[0];
  for (let i = 1; i <= steps.length; i++) {
    if (steps[i] === steps[i - 1] + 1) continue;
    const end = steps[i - 1];
    runs.push(start === end ? `${start}` : `${start}–${end}`);
    start = steps[i];
  }
  return runs.join(', ');
}

/** An exception's band, and its variation when it names one: 'id#variation'. */
const overrideTarget = (o: PairingOverride) =>
  o.variation ? `${o.band}#${o.variation}` : o.band;

/** 'Funk Band 1 · The Pocket' for 'funk-band-1#pocket'. */
function targetName(bands: readonly Band[], target: string): string {
  const [id, variationId] = target.split('#');
  const b = bands.find((x) => x.id === id);
  const v = b?.variations?.find((x) => x.id === variationId);
  return `${b?.name ?? id}${v ? ` · ${v.name}` : ''}`;
}

const exceptionLabel = (o: PairingOverride) =>
  [
    o.section ? `section ${o.section}` : 'every section',
    o.steps?.length ? `steps ${stepsLabel(o.steps)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

interface Props {
  band: Band;
  /** Unsaved changes: assigning plays the saved band, so it says so. */
  dirty: boolean;
}

export const BandAssignments = ({ band, dirty }: Props) => {
  const pairings = usePairingList();
  const bands = useBandList();
  const [busy, setBusy] = useState<string | null>(null);
  const byStyle = new Map(pairings.map((p) => [p.id, p]));
  const bandName = (target: string) => targetName(bands, target);

  const write = async (styleId: string, next: LessonPairing) => {
    setBusy(styleId);
    try {
      await savePairing(next);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  // Assigning a band replaces whatever the style played before — its own
  // band, or the drums, bass and comping it named one by one.
  const assign = (style: LessonStyle) =>
    write(style.id, {
      id: style.id,
      band: band.id,
      overrides: byStyle.get(style.id)?.overrides,
    });
  const unassign = (style: LessonStyle) => {
    const p = byStyle.get(style.id);
    return write(style.id, {
      ...p,
      id: style.id,
      band: undefined,
      variation: undefined,
    });
  };
  const setVariation = (style: LessonStyle, variation: string | undefined) => {
    const p = byStyle.get(style.id) ?? { id: style.id };
    return write(style.id, { ...p, variation });
  };
  const setOverrides = (style: LessonStyle, overrides: PairingOverride[]) => {
    const p = byStyle.get(style.id) ?? { id: style.id };
    return write(style.id, {
      ...p,
      overrides: overrides.length ? overrides : undefined,
    });
  };

  // Styles grouped as the curriculum is: genre, then level.
  const groups = new Map<string, LessonStyle[]>();
  for (const style of LESSON_STYLES) {
    const key = `${style.genreName} L${style.level}`;
    groups.set(key, [...(groups.get(key) ?? []), style]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        A band plays every play-along step in the style you give it, and that
        level&rsquo;s Practice Track; switching styles on the Practice Track
        switches bands. Add an exception only where a section or some steps in
        the style need a different band.
        {band.status !== 'live' &&
          ' This band is a draft: lessons keep their own backing until it is published.'}
        {dirty && ' Lessons play the band as saved.'}
      </p>
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
        {[...groups].map(([group, styles]) => (
          <div key={group} className="flex flex-col gap-1.5">
            <div className={CONSOLE_LABEL}>{group}</div>
            {styles.map((style) => {
              const p = byStyle.get(style.id);
              const mine = p?.band === band.id;
              const plays = mine
                ? (band.variations?.find((v) => v.id === p?.variation) ??
                  variationForStyle(band, style.id))
                : undefined;
              const legacy = !p?.band
                ? [
                    p?.drums && 'drums',
                    p?.bass && 'bass',
                    p?.comping && 'comping',
                  ].filter(Boolean)
                : [];
              return (
                <StyleRow
                  key={style.id}
                  style={style}
                  pairing={p}
                  mine={mine}
                  status={
                    mine
                      ? `Plays this band${plays ? ` · ${plays.name}` : ''}`
                      : p?.band
                        ? `Plays ${bandName(p.band)}`
                        : legacy.length
                          ? `${legacy.join(', ').replace(/^./, (c) => c.toUpperCase())} set on its own`
                          : 'Its own backing'
                  }
                  busy={busy === style.id}
                  bands={bands}
                  currentBand={band}
                  onAssign={() => void assign(style)}
                  onUnassign={() => void unassign(style)}
                  onVariation={(v) => void setVariation(style, v)}
                  onOverrides={(o) => void setOverrides(style, o)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const StyleRow = ({
  style,
  pairing,
  mine,
  status,
  busy,
  bands,
  currentBand,
  onAssign,
  onUnassign,
  onVariation,
  onOverrides,
}: {
  style: LessonStyle;
  pairing: LessonPairing | undefined;
  mine: boolean;
  status: string;
  busy: boolean;
  bands: readonly Band[];
  currentBand: Band;
  onAssign: () => void;
  onUnassign: () => void;
  onVariation: (variation: string | undefined) => void;
  onOverrides: (overrides: PairingOverride[]) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [section, setSection] = useState('');
  const [steps, setSteps] = useState('');
  const [other, setOther] = useState('');
  const overrides = pairing?.overrides ?? [];
  const bandName = (target: string) => targetName(bands, target);
  const made = variationForStyle(currentBand, style.id);
  const select =
    'rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-xs';

  return (
    <div
      className={`rounded-md border px-2.5 py-2 text-sm ${mine ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-white/[0.08]'}`}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate">{style.name}</div>
          <div className="truncate text-xs text-muted-foreground">{status}</div>
        </div>
        {CAN_WRITE_FILES &&
          (mine ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onUnassign}
            >
              Remove
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onAssign}
            >
              Use this band
            </Button>
          ))}
      </div>

      {CAN_WRITE_FILES && mine && !!currentBand.variations?.length && (
        <select
          value={pairing?.variation ?? ''}
          onChange={(e) => onVariation(e.target.value || undefined)}
          className={`${select} mt-1.5 max-w-full`}
          aria-label={`The variation ${style.name} plays`}
        >
          <option value="">
            {made?.style === style.id
              ? `The one made for it (${made.name})`
              : `The first (${made?.name ?? '—'})`}
          </option>
          {currentBand.variations.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}

      {overrides.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 text-xs">
          {overrides.map((o, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Except</span>
              <span>{exceptionLabel(o)}</span>
              <span className="text-muted-foreground">plays</span>
              <span className="truncate">{bandName(overrideTarget(o))}</span>
              {CAN_WRITE_FILES && (
                <button
                  type="button"
                  aria-label={`Remove the exception for ${exceptionLabel(o)}`}
                  className="ml-auto text-muted-foreground hover:text-white"
                  onClick={() =>
                    onOverrides(overrides.filter((_, j) => j !== i))
                  }
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {CAN_WRITE_FILES &&
        pairing?.band &&
        (adding ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Except</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className={select}
              aria-label="Section"
            >
              <option value="">every section</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  section {s}
                </option>
              ))}
            </select>
            <input
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="steps, e.g. 3–6 (all)"
              className={`${select} w-36`}
              aria-label="Steps"
            />
            <span className="text-muted-foreground">plays</span>
            <select
              value={other}
              onChange={(e) => setOther(e.target.value)}
              className={select}
              aria-label="Band"
            >
              <option value="">a band…</option>
              {bands.map((b) => {
                const name =
                  b.id === currentBand.id ? `${b.name} (this band)` : b.name;
                return b.variations?.length ? (
                  <optgroup key={b.id} label={name}>
                    {b.variations.map((v) => (
                      <option key={v.id} value={`${b.id}#${v.id}`}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={b.id} value={b.id}>
                    {name}
                  </option>
                );
              })}
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!other || (!section && !parseSteps(steps).length)}
              onClick={() => {
                const parsed = parseSteps(steps);
                const [otherBand, otherVariation] = other.split('#');
                onOverrides([
                  ...overrides,
                  {
                    ...(section ? { section } : {}),
                    ...(parsed.length ? { steps: parsed } : {}),
                    band: otherBand,
                    ...(otherVariation ? { variation: otherVariation } : {}),
                  },
                ]);
                setAdding(false);
                setSection('');
                setSteps('');
                setOther('');
              }}
            >
              Add
            </Button>
            <button
              type="button"
              className="text-muted-foreground hover:text-white"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3" /> Exception for a section or steps
          </button>
        ))}
    </div>
  );
};
