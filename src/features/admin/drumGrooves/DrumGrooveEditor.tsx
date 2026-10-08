/* eslint-disable react/jsx-sort-props */
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Play,
  Redo2,
  Save,
  Square,
  Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { CODE_GROOVES } from '@/curriculum/engine/drumGrooves/codeGrooves';
import {
  GROOVE_GRIDS,
  LOOP_LENGTHS,
  TEMPO_UNITS,
  barTicks,
  offGridHits,
  patternTicks,
  resizeLoop,
  toCounted,
  toQuarterBpm,
  type DrumGroove,
  type DrumGrooveHit,
  type GrooveGridId,
  type TempoUnit,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  CUSTOM_DRUM_KITS,
  DRUM_PADS,
  padLabel,
  resolveCustomKit,
  type CustomDrumKitFile,
} from '@/daw/instruments/drumKits';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_PANEL, consoleTabClass } from '../ui/styles';
import { GrooveGrid } from './GrooveGrid';
import { KitPanel } from './KitPanel';
import { downloadGroove } from './devFiles';
import { useInstrumentStore } from './instrumentStore';
import { useGroovePlayer } from './useGroovePlayer';
import { useUndoable } from './useUndoable';

/** Rows top to bottom: cymbals, hats, toms, snare family, kick. */
const ROW_ORDER = [49, 51, 46, 42, 44, 48, 45, 41, 40, 38, 36];
const DEFAULT_ROWS = [42, 38, 36];

const GENRES = [
  'funk',
  'pop',
  'hip-hop',
  'rock',
  'rnb',
  'neo-soul',
  'jazz',
  'blues',
  'latin',
  'reggae',
  'african',
  'electronic',
  'folk',
  'jam-band',
];

const fieldLabel = CONSOLE_LABEL;
const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#60a5fa]';

const Field: FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-1">
    <span className={fieldLabel}>{label}</span>
    <span className="flex items-center gap-1.5">{children}</span>
  </label>
);

const int = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

interface Props {
  groove: DrumGroove;
  /** Called after a successful file write with what was written. */
  onSaved: (groove: DrumGroove) => void;
  onDuplicate: (groove: DrumGroove) => void;
}

export const DrumGrooveEditor: FC<Props> = ({
  groove: initial,
  onSaved,
  onDuplicate,
}) => {
  const history = useUndoable<DrumGroove>(initial);
  const store = useInstrumentStore();
  const canSave = store.canSave('drum_groove');
  const draft = history.value;
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monitor, setMonitor] = useState(0.8);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());
  const [extraRows, setExtraRows] = useState<number[]>(DEFAULT_ROWS);
  const [customKit, setCustomKit] = useState<CustomDrumKitFile | null>(null);
  const player = useGroovePlayer(monitor);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  const setDraft = history.set;
  const set = useCallback(
    (patch: Partial<DrumGroove>) => setDraft((g) => ({ ...g, ...patch })),
    [setDraft],
  );
  const setHits = useCallback((hits: DrumGrooveHit[]) => set({ hits }), [set]);

  const kitOverride = useMemo(
    () => (customKit ? resolveCustomKit(customKit) : undefined),
    [customKit],
  );
  const kitBase =
    customKit?.base ??
    CUSTOM_DRUM_KITS.find((k) => k.id === draft.kit)?.base ??
    draft.kit;

  const rows = useMemo(() => {
    const used = new Set([...draft.hits.map((h) => h.note), ...extraRows]);
    return ROW_ORDER.filter((n) => used.has(n));
  }, [draft.hits, extraRows]);
  const addable = DRUM_PADS.filter((p) => !rows.includes(p.note));

  const offGrid = useMemo(
    () => offGridHits(draft.hits, draft.grid),
    [draft.hits, draft.grid],
  );
  const loopT = patternTicks(draft);
  const feltHits = draft.hits.filter((h) => h.offset).length;
  const beyondEnd = draft.hits.filter((h) => h.tick >= loopT);
  const codeGroove = CODE_GROOVES.find((g) => g.id === draft.id);

  // Hear every musical edit on the next pass, without stopping.
  useEffect(() => {
    if (player.playing) void player.play(draft, { muted, kitOverride });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, muted, kitOverride]);

  const togglePlay = useCallback(() => {
    if (player.playing) player.stop();
    else void player.play(draft, { muted, kitOverride });
  }, [player, draft, muted, kitOverride]);

  const save = useCallback(
    async (status?: DrumGroove['status']) => {
      const next = status ? { ...draft, status } : draft;
      setSaving(true);
      setError(null);
      try {
        await store.save('drum_groove', next);
        if (status) setDraft(next);
        setSaved(next);
        onSaved(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [draft, setDraft, onSaved, store],
  );

  // Space plays/stops, ⌘Z / ⌘⇧Z undo and redo, ⌘S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA';
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        togglePlay();
      } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave && dirty) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, history, dirty, save]);

  // Warn before leaving with unsaved work.
  // The content area's guard: leaving with unsaved edits asks first.
  useUnsavedChanges(dirty);

  const setBars = (bars: number) => setDraft((g) => resizeLoop(g, bars));

  const copyBar = (from: number, to: number) => {
    const barT = barTicks(draft.timeSignature);
    const src = draft.hits.filter(
      (h) => h.tick >= from * barT && h.tick < (from + 1) * barT,
    );
    const kept = draft.hits.filter(
      (h) => h.tick < to * barT || h.tick >= (to + 1) * barT,
    );
    setHits([
      ...kept,
      ...src.map((h) => ({ ...h, tick: h.tick + (to - from) * barT })),
    ]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to={AdminRoutes.drumGrooves()}>
            <ArrowLeft /> All grooves
          </Link>
        </Button>
        <span className="tabular-nums text-xs text-white/40">{draft.id}</span>
        <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
          {draft.status === 'live' ? 'Published' : 'Draft'}
        </ConsoleBadge>
        {codeGroove && (
          <span className="text-xs text-muted-foreground">
            {draft.status === 'live'
              ? `Replaces the code groove "${codeGroove.label}" in lessons.`
              : `Publish to replace the code groove "${codeGroove.label}".`}
          </span>
        )}
      </div>

      {error && <ConsoleCallout tone="danger">{error}</ConsoleCallout>}
      {!canSave && (
        <ConsoleCallout tone="info">
          Grooves are repo files for now, so saving only works on the local dev
          server. Here you can audition and edit, then Export the JSON into
          src/curriculum/data/drumGrooves/.
        </ConsoleCallout>
      )}

      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-64 flex-1 bg-transparent text-[2rem] leading-[1.1] tracking-[-0.02em] text-white outline-none"
          aria-label="Groove name"
        />
        <Button
          onClick={togglePlay}
          className={player.playing ? 'bg-rose-500 hover:bg-rose-400' : ''}
        >
          {player.loading ? (
            <Loader2 className="animate-spin" />
          ) : player.playing ? (
            <Square />
          ) : (
            <Play />
          )}
          {player.playing ? 'Stop' : 'Play'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={history.undo}
          disabled={!history.canUndo}
          aria-label="Undo"
          title="Undo (⌘Z)"
        >
          <Undo2 />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={history.redo}
          disabled={!history.canRedo}
          aria-label="Redo"
          title="Redo (⌘⇧Z)"
        >
          <Redo2 />
        </Button>
        {canSave ? (
          <>
            <Button
              variant="outline"
              onClick={() => void save()}
              disabled={saving || !dirty}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {dirty ? 'Save' : 'Saved'}
            </Button>
            <Button
              onClick={() =>
                void save(draft.status === 'live' ? 'draft' : 'live')
              }
              disabled={saving}
            >
              {draft.status === 'live' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onDuplicate(draft)}
              title="Save a copy under a new id"
            >
              <Copy /> Duplicate
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => downloadGroove(draft)}>
            <Download /> Export JSON
          </Button>
        )}
      </div>

      <input
        value={draft.description ?? ''}
        onChange={(e) => set({ description: e.target.value || undefined })}
        placeholder="What this groove is — style, era, reference records"
        className={`${control} w-full`}
        aria-label="Description"
      />

      {/* ── transport and shape ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        <Field label="Genre">
          <select
            value={draft.genre ?? ''}
            onChange={(e) => set({ genre: e.target.value || undefined })}
            className={control}
          >
            <option value="">—</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tempo (audition)">
          <input
            type="number"
            min={20}
            max={400}
            value={toCounted(draft.tempo, draft.tempoUnit)}
            onChange={(e) =>
              set({
                tempo: toQuarterBpm(int(e.target.value, 100), draft.tempoUnit),
              })
            }
            className={`${control} w-16`}
          />
          <select
            value={draft.tempoUnit}
            onChange={(e) => set({ tempoUnit: e.target.value as TempoUnit })}
            className={control}
            aria-label="Tempo counts"
            title="What the number counts — a 12/8 shuffle is counted in dotted quarters"
          >
            {TEMPO_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol} =
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time">
          <input
            type="number"
            min={1}
            max={24}
            value={draft.timeSignature[0]}
            onChange={(e) =>
              set({
                timeSignature: [
                  Math.max(1, int(e.target.value, 4)),
                  draft.timeSignature[1],
                ],
              })
            }
            className={`${control} w-12`}
            aria-label="Beats per bar"
          />
          <span className="text-white/40">/</span>
          <select
            value={draft.timeSignature[1]}
            onChange={(e) =>
              set({
                timeSignature: [draft.timeSignature[0], int(e.target.value, 4)],
              })
            }
            className={control}
            aria-label="Beat value"
          >
            {[2, 4, 8, 16].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Felt beats">
          <input
            type="number"
            min={1}
            max={24}
            value={draft.feltBeats}
            onChange={(e) =>
              set({ feltBeats: Math.max(1, int(e.target.value, 4)) })
            }
            className={`${control} w-12`}
            title="Pulses a musician taps per bar — 4 for a 12/8 shuffle"
          />
        </Field>
        {/* Not a <Field>: a <label> forwards clicks to its first button. */}
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Loop</span>
          <div
            role="radiogroup"
            aria-label="Loop length"
            className="flex flex-wrap gap-1.5"
          >
            {[
              ...LOOP_LENGTHS,
              ...(LOOP_LENGTHS.includes(draft.bars as never)
                ? []
                : [draft.bars]),
            ].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={draft.bars === n}
                onClick={() => setBars(n)}
                className={consoleTabClass(draft.bars === n, 'sm')}
              >
                {n} bar{n === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        </div>
        <Field label="Grid">
          <select
            value={draft.grid}
            onChange={(e) => set({ grid: e.target.value as GrooveGridId })}
            className={control}
          >
            {GROOVE_GRIDS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Swing ${draft.swing}`}>
          <input
            type="range"
            min={50}
            max={75}
            step={1}
            value={draft.swing}
            onChange={(e) => set({ swing: Number(e.target.value) })}
            className="w-28 accent-white"
            title="Audition only — in a lesson the step's swing applies to every part"
          />
        </Field>
        <Field
          label={`Humanize ±${draft.humanize.timing}t / ±${draft.humanize.velocity}v`}
        >
          <input
            type="range"
            min={0}
            max={12}
            value={draft.humanize.timing}
            onChange={(e) =>
              set({
                humanize: {
                  ...draft.humanize,
                  timing: Number(e.target.value),
                },
              })
            }
            className="w-20 accent-white"
            aria-label="Timing humanize (ticks late)"
            title="Up to this many ticks late, re-rolled every play-along"
          />
          <input
            type="range"
            min={0}
            max={20}
            value={draft.humanize.velocity}
            onChange={(e) =>
              set({
                humanize: {
                  ...draft.humanize,
                  velocity: Number(e.target.value),
                },
              })
            }
            className="w-20 accent-white"
            aria-label="Velocity humanize"
            title="Velocity varies by up to this much, re-rolled every play-along"
          />
        </Field>
        <Field label="Monitor">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={monitor}
            onChange={(e) => setMonitor(Number(e.target.value))}
            className="w-20 accent-white"
            aria-label="Monitor volume"
          />
        </Field>
      </section>

      <p className="-mt-2 text-xs text-muted-foreground">
        Lessons keep their own tempo and swing (the step&rsquo;s swing moves the
        bass, chords and the student&rsquo;s notes too), so those two settings
        here are for auditioning. A Theory Practice Track plays the groove
        published as <span className="tabular-nums">theory_practice_track</span>{' '}
        at its own tempo and swing. Click a cell to add · click again to cycle
        ghost → soft → normal → accent · right-click to clear · Space plays.
      </p>

      {draft.timeSignature.join('/') !== '4/4' && (
        <ConsoleCallout tone="warning">
          Activity play-alongs are written in 4/4; a{' '}
          {draft.timeSignature.join('/')} groove will loop across their bar
          lines.
        </ConsoleCallout>
      )}
      {offGrid.length > 0 && (
        <ConsoleCallout tone="warning">
          {offGrid.length} hit{offGrid.length === 1 ? '' : 's'} fall between
          steps on this grid (
          {[...new Set(offGrid.map((h) => padLabel(h.note, kitBase)))].join(
            ', ',
          )}
          ). They still play and are kept when you save — choose a finer grid to
          reach them.
        </ConsoleCallout>
      )}
      {beyondEnd.length > 0 && (
        <ConsoleCallout tone="warning">
          {beyondEnd.length} hit{beyondEnd.length === 1 ? '' : 's'} sit past bar{' '}
          {draft.bars} and won&rsquo;t play. They&rsquo;re kept, so a longer
          loop or undo (⌘Z) brings them back.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => setHits(draft.hits.filter((h) => h.tick < loopT))}
          >
            Remove them
          </button>
        </ConsoleCallout>
      )}

      <GrooveGrid
        groove={draft}
        rows={rows}
        kitBase={kitBase}
        muted={muted}
        playTick={player.playTick}
        onChange={setHits}
        onPadGain={(note, gain) =>
          set({ padGains: { ...draft.padGains, [note]: gain } })
        }
        onToggleMute={(note) =>
          setMuted((m) => {
            const next = new Set(m);
            if (next.has(note)) next.delete(note);
            else next.add(note);
            return next;
          })
        }
        onAudition={(note) =>
          void player.audition(draft.kit, note, 96, kitOverride)
        }
        onRemoveRow={(note) => setExtraRows((r) => r.filter((n) => n !== note))}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {addable.length > 0 && (
          <select
            value=""
            onChange={(e) =>
              setExtraRows((r) => [...r, Number(e.target.value)])
            }
            className={control}
            aria-label="Add a pad row"
          >
            <option value="">+ Add pad…</option>
            {addable.map((p) => (
              <option key={p.note} value={p.note}>
                {padLabel(p.note, kitBase)}
              </option>
            ))}
          </select>
        )}
        {draft.bars > 1 && (
          <select
            value=""
            onChange={(e) => {
              const [from, to] = e.target.value.split('>').map(Number);
              copyBar(from, to);
            }}
            className={control}
            aria-label="Copy a bar"
          >
            <option value="">Copy bar…</option>
            {Array.from({ length: draft.bars }, (_, from) =>
              Array.from({ length: draft.bars }, (__, to) =>
                from === to ? null : (
                  <option key={`${from}>${to}`} value={`${from}>${to}`}>
                    Bar {from + 1} → bar {to + 1}
                  </option>
                ),
              ),
            )}
          </select>
        )}
        {feltHits > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setHits(draft.hits.map(({ offset: _feel, ...h }) => h))
            }
            title="Snap every hit to where it's written — the white marks show the played timing that would be lost"
          >
            Quantize feel ({feltHits})
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {draft.hits.length} hits · {draft.bars} bar
          {draft.bars === 1 ? '' : 's'} looped across the play-along
        </span>
      </div>

      <KitPanel
        kit={draft.kit}
        onKit={(kit) => set({ kit })}
        customKit={customKit}
        onCustomKit={(kit) => {
          setCustomKit(kit);
          if (kit) set({ kit: kit.id });
        }}
        onError={setError}
      />
    </div>
  );
};
