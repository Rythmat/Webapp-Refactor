/* eslint-disable react/jsx-sort-props */
/**
 * One chord comping pattern: a grid of chord hits (full chord, upper tones,
 * top note), heard voiced over a progression with a drum groove and,
 * optionally, a bass line while you edit. Laid out like the Bass Lines
 * editor (header, the pattern's fields, what to hear it over, the grid).
 *
 * What the pattern plays over (changes, key, drums, bass, tempo) is audition
 * only and isn't saved, except the grooves it's paired with.
 */

import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Play,
  Plus,
  Save,
  Square,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  hashSeed,
  realizeLine,
  sameMeter,
  type BassSwingOn,
} from '@/curriculum/engine/bassLines/bassLine';
import {
  chordSpans,
  chordSymbol,
  KEYS,
  keyPrefersFlats,
  pcName,
  progressionById,
  PROGRESSIONS,
  realizePreset,
} from '@/curriculum/engine/bassLines/harmony';
import {
  COMPING_GRIDS,
  compingBars,
  realizeComping,
  type ChordComping,
  type CompingGridId,
  type CompingTones,
} from '@/curriculum/engine/chordComping/chordComping';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import { feelFor } from '../bassLines/BassLineEditor';
import { useBassLineList } from '../bassLines/bassLineSession';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { useUndoable } from '../drumGrooves/useUndoable';
import { UseInLessons } from '../lessonPairings/UseInLessons';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { UndoRedo } from '../ui/UndoRedo';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import { CompingRoll, type ChordMark } from './CompingRoll';
import { RealizedChords } from './RealizedChords';
import { CAN_WRITE_FILES, downloadComping, saveComping } from './compingFiles';
import {
  hitsPastEnd,
  previewHarmony,
  rollGeometry,
  TONE_ROWS,
  withIds,
  withoutIds,
  withTones,
  type EditorHit,
} from './compingGrid';
import { useCompingPlayer } from './useCompingPlayer';

const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#60a5fa]';

const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-1">
    <span className={CONSOLE_LABEL}>{label}</span>
    <span className="flex items-center gap-1.5">{children}</span>
  </label>
);

const int = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const CEILINGS = [
  { midi: 72, label: 'C5 (lessons)' },
  { midi: 84, label: 'C6' },
  { midi: 96, label: 'C7 (Hip Hop)' },
];

type Draft = Omit<ChordComping, 'hits'> & { hits: EditorHit[] };
const toDraft = (c: ChordComping): Draft => ({ ...c, hits: withIds(c.hits) });
const toPattern = (d: Draft): ChordComping => ({
  ...d,
  hits: withoutIds(d.hits),
});

interface Props {
  pattern: ChordComping;
  onDuplicate: (pattern: ChordComping) => void;
}

export const ChordCompingEditor: FC<Props> = ({
  pattern: initial,
  onDuplicate,
}) => {
  const history = useUndoable<Draft>(toDraft(initial));
  const draft = history.value;
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit

  const pattern = useMemo(() => toPattern(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(pattern) !== JSON.stringify(saved),
    [pattern, saved],
  );
  const set = useCallback(
    (patch: Partial<Draft>) => history.set((d) => ({ ...d, ...patch })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history.set],
  );
  const edit = useCallback(
    (fn: (hits: EditorHit[]) => EditorHit[], transient = false) =>
      (transient ? history.replace : history.set)((d) => ({
        ...d,
        hits: fn(d.hits),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history.set, history.replace],
  );

  // ── geometry ──
  const ts = draft.timeSignature;
  const bars = compingBars(draft);
  const grid =
    COMPING_GRIDS.find((g) => g.id === draft.gridResolution) ??
    COMPING_GRIDS[0];
  const geometry = useMemo(
    () => rollGeometry(ts, grid.perBeat, bars),
    [ts, grid.perBeat, bars],
  );
  const fitW = Math.max(
    12,
    Math.min(56, Math.floor(880 / geometry.totalSteps)),
  );
  const cellW = zoom ?? fitW;
  const pxPerQuarter = cellW / geometry.stepQ;

  // ── what to hear it over (not saved) ──
  const [progressionId, setProgressionId] = useState(
    ts[0] === 3 ? 'turnaround' : (PROGRESSIONS[0]?.id ?? ''),
  );
  const [keyPc, setKeyPc] = useState(0);
  const progression = progressionById(progressionId);
  const chartBars = useMemo(
    () => realizePreset(progression, keyPc),
    [progression, keyPc],
  );
  const flats = keyPrefersFlats(keyPc, Boolean(progression.minor));

  const allGrooves = useGrooveList();
  const paired = draft.grooves
    .map((id) => allGrooves.find((g) => g.id === id))
    .filter((g): g is DrumGroove => Boolean(g));
  const missingPairs = draft.grooves.filter(
    (id) => !allGrooves.some((g) => g.id === id),
  );
  const others = allGrooves.filter(
    (g) => !draft.grooves.includes(g.id) && sameMeter(g.timeSignature, ts),
  );
  const [grooveId, setGrooveId] = useState<string>(() => paired[0]?.id ?? '');
  const groove = allGrooves.find((g) => g.id === grooveId) ?? null;
  const [feel, setFeel] = useState(() => feelFor(groove));
  const pickGroove = (id: string) => {
    setGrooveId(id);
    setFeel(feelFor(allGrooves.find((g) => g.id === id) ?? null));
  };

  // The comping's genre, from the groove it pairs with: the bass walks and
  // approaches by its rules.
  const pairedGenre = paired.find((g) => g.genre)?.genre;
  const bassLines = useBassLineList();
  const [bassId, setBassId] = useState<string>(
    () =>
      bassLines.find((l) => l.grooves.some((g) => draft.grooves.includes(g)))
        ?.id ?? '',
  );
  const bassLine = bassLines.find((l) => l.id === bassId) ?? null;

  const [click, setClick] = useState(true);
  const [chordVolume, setChordVolume] = useState(0.8);
  const [bassVolume, setBassVolume] = useState(0.8);
  const [drumVolume, setDrumVolume] = useState(0.7);
  const player = useCompingPlayer(chordVolume, bassVolume, drumVolume);

  // ── the realized pattern ──
  const harmony = useMemo(
    () => previewHarmony(chartBars, ts, geometry.totalQ),
    [chartBars, ts, geometry.totalQ],
  );
  const chordNotes = useMemo(
    () =>
      harmony ? realizeComping(pattern, harmony.chordAt, harmony.bars, ts) : [],
    [pattern, harmony, ts],
  );
  const realizedBass = useMemo(() => {
    if (!harmony || !bassLine) return null;
    return realizeLine(bassLine, chartBars, {
      timeSignature: ts,
      passes: Math.max(1, Math.round(harmony.loopQ / harmony.chartQ)),
      seed: hashSeed(bassLine.name || 'line', String(chartBars.length)),
      genre: pairedGenre,
    });
  }, [harmony, bassLine, chartBars, ts, pairedGenre]);

  // Chords along the top of the grid, over the pattern's own length.
  const chordMarks = useMemo<ChordMark[]>(() => {
    if (!harmony) return [];
    const { spans } = chordSpans(chartBars, ts);
    const out: ChordMark[] = [];
    for (let base = 0; base < geometry.totalQ - 1e-6; base += harmony.chartQ)
      spans.forEach((s) => {
        if (base + s.start < geometry.totalQ - 1e-6)
          out.push({
            q: base + s.start,
            end: Math.min(geometry.totalQ, base + s.end),
            label: chordSymbol(s.chord, s.chord.flats ?? flats),
          });
      });
    return out;
  }, [harmony, chartBars, ts, geometry.totalQ, flats]);

  // ── audio: every edit is heard on the next pass, without stopping ──
  const playOptions = useMemo(
    () =>
      harmony && {
        chords: chordNotes,
        bass: realizedBass,
        bassInstrument: bassLine?.instrument ?? 'upright',
        loopQ: harmony.loopQ,
        timeSignature: ts,
        groove,
        click,
        ...feel,
      },
    [harmony, chordNotes, realizedBass, bassLine, ts, groove, click, feel],
  );
  useEffect(() => {
    if (player.playing && playOptions) void player.play(playOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playOptions]);
  const togglePlay = useCallback(() => {
    if (player.playing) player.stop();
    else if (playOptions) void player.play(playOptions);
  }, [player, playOptions]);

  const save = useCallback(
    async (status?: ChordComping['status']) => {
      const next = status ? { ...pattern, status } : pattern;
      setSaving(true);
      setError(null);
      try {
        await saveComping(next);
        if (status) set({ status });
        setSaved(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [pattern, set],
  );

  // Space plays/stops, ⌘Z / ⌘⇧Z undo and redo, ⌘S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
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
        if (CAN_WRITE_FILES && dirty) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, history, dirty, save]);

  useUnsavedChanges(dirty);

  const sel = draft.hits.find((h) => h._id === selected) ?? null;
  const patchSel = (p: Partial<EditorHit>) =>
    edit((hs) => hs.map((h) => (h._id === selected ? { ...h, ...p } : h)));
  const pastEnd = hitsPastEnd(draft.hits, ts, geometry.totalQ);
  const playheadQ = player.playheadQ;
  const ceilings = CEILINGS.some((c) => c.midi === draft.ceiling)
    ? CEILINGS
    : [
        ...CEILINGS,
        { midi: draft.ceiling, label: `MIDI ${draft.ceiling} (current)` },
      ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to={AdminRoutes.chordComping()}>
            <ArrowLeft /> All comping patterns
          </Link>
        </Button>
        <span className="tabular-nums text-xs text-white/40">{draft.id}</span>
        <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
          {draft.status === 'live' ? 'Published' : 'Draft'}
        </ConsoleBadge>
      </div>

      {(error ?? player.error) && (
        <ConsoleCallout tone="danger">{error ?? player.error}</ConsoleCallout>
      )}
      {!CAN_WRITE_FILES && (
        <ConsoleCallout tone="info">
          Comping patterns are repo files for now, so saving only works on the
          local dev server. Here you can audition and edit, then Export the JSON
          into src/curriculum/data/chordComping/.
        </ConsoleCallout>
      )}

      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-64 flex-1 bg-transparent text-[2rem] leading-[1.1] tracking-[-0.02em] text-white outline-none"
          aria-label="Pattern name"
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
        <UndoRedo history={history} />
        {CAN_WRITE_FILES ? (
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
              onClick={() => onDuplicate(pattern)}
              title="Save a copy under a new id"
            >
              <Copy /> Duplicate
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => downloadComping(pattern)}>
            <Download /> Export JSON
          </Button>
        )}
      </div>

      <input
        value={draft.description ?? ''}
        onChange={(e) => set({ description: e.target.value || undefined })}
        placeholder="What this pattern does — feel, style, where it fits"
        className={`${control} w-full`}
        aria-label="Description"
      />

      {/* ── the pattern ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        <Field label="Time">
          <input
            type="number"
            min={1}
            max={24}
            value={ts[0]}
            onChange={(e) =>
              set({
                timeSignature: [Math.max(1, int(e.target.value, 4)), ts[1]],
              })
            }
            className={`${control} w-12`}
            aria-label="Beats per bar"
          />
          <span className="text-white/40">/</span>
          <select
            value={ts[1]}
            onChange={(e) =>
              set({ timeSignature: [ts[0], int(e.target.value, 4)] })
            }
            className={control}
            aria-label="Beat value"
          >
            {[2, 4, 8].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bars">
          <input
            type="number"
            min={1}
            value={bars}
            onChange={(e) =>
              set({ length: `${Math.max(1, int(e.target.value, 1))}m` })
            }
            className={`${control} w-16`}
          />
        </Field>
        <Field label="Grid">
          <select
            value={draft.gridResolution}
            onChange={(e) =>
              set({ gridResolution: e.target.value as CompingGridId })
            }
            className={control}
          >
            {COMPING_GRIDS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ceiling">
          <select
            value={draft.ceiling}
            onChange={(e) => set({ ceiling: Number(e.target.value) })}
            className={control}
            title="The highest note a voicing may reach"
          >
            {ceilings.map((c) => (
              <option key={c.midi} value={c.midi}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <span className={CONSOLE_LABEL}>Pairs with</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {paired.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 py-0.5 pl-2.5 pr-1 text-xs"
              >
                {g.name}
                <button
                  type="button"
                  aria-label={`Unpair ${g.name}`}
                  className="rounded-full p-0.5 text-white/50 hover:text-white"
                  onClick={() =>
                    set({ grooves: draft.grooves.filter((id) => id !== g.id) })
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {missingPairs.map((id) => (
              <span
                key={id}
                className="text-xs text-amber-300/80"
                title="No drum groove has this id"
              >
                {id}?
              </span>
            ))}
            {groove && !draft.grooves.includes(groove.id) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => set({ grooves: [...draft.grooves, groove.id] })}
              >
                <Plus /> Pair with {groove.name}
              </Button>
            )}
            {!paired.length && !groove && (
              <span className="text-xs text-white/40">
                Pick drums below to pair one.
              </span>
            )}
          </div>
        </div>
        <UseInLessons
          kind="comping"
          itemId={draft.id}
          live={draft.status === 'live'}
        />
      </section>

      {/* ── what to hear it over ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        <Field label="Changes">
          <select
            value={progressionId}
            onChange={(e) => setProgressionId(e.target.value)}
            className={control}
            aria-label="Progression"
          >
            {[...new Set(PROGRESSIONS.map((p) => p.group))].map((group) => (
              <optgroup key={group} label={group}>
                {PROGRESSIONS.filter((p) => p.group === group).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            value={keyPc}
            onChange={(e) => setKeyPc(Number(e.target.value))}
            className={control}
            aria-label="Key"
          >
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>
                {progression.minor
                  ? `${pcName(k.pc, keyPrefersFlats(k.pc, true))} minor`
                  : k.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Drums">
          <select
            value={grooveId}
            onChange={(e) => pickGroove(e.target.value)}
            className={control}
          >
            <option value="">None (click)</option>
            {paired.length > 0 && (
              <optgroup label="Paired with this pattern">
                {paired.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={`Other grooves in ${ts.join('/')}`}>
              {others.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.status === 'live' ? '' : ' (draft)'}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="Bass">
          <select
            value={bassId}
            onChange={(e) => setBassId(e.target.value)}
            className={control}
          >
            <option value="">None</option>
            {bassLines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {sameMeter(l.timeSignature, ts)
                  ? ''
                  : ` (${l.timeSignature.join('/')})`}
                {l.status === 'live' ? '' : ' (draft)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tempo ♩">
          <input
            type="number"
            min={30}
            max={400}
            value={feel.tempo}
            onChange={(e) =>
              setFeel({
                ...feel,
                tempo: Math.max(30, Math.min(400, int(e.target.value, 120))),
              })
            }
            className={`${control} w-16`}
          />
        </Field>
        <Field label={`Swing ${feel.swing}%`}>
          <input
            type="range"
            min={50}
            max={75}
            step={1}
            value={feel.swing}
            onChange={(e) =>
              setFeel({ ...feel, swing: Number(e.target.value) })
            }
            title="Chords and bass. 50 is straight, 66 a triplet feel. Picking drums sets it to match their swing; the drums keep their own."
            aria-label="Swing"
          />
          <select
            value={feel.swingOn}
            onChange={(e) =>
              setFeel({ ...feel, swingOn: e.target.value as BassSwingOn })
            }
            className={control}
            aria-label="Swing on"
          >
            <option value="eighths">8ths</option>
            <option value="sixteenths">16ths</option>
          </select>
        </Field>
        {!groove && (
          <label className="flex items-center gap-2 pb-1 text-sm text-white/70">
            <input
              type="checkbox"
              checked={click}
              onChange={(e) => setClick(e.target.checked)}
            />{' '}
            Click
          </label>
        )}
        <Field label="Chord level">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={chordVolume}
            onChange={(e) => setChordVolume(Number(e.target.value))}
            aria-label="Chord volume"
          />
        </Field>
        {bassLine && (
          <Field label="Bass level">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bassVolume}
              onChange={(e) => setBassVolume(Number(e.target.value))}
              aria-label="Bass volume"
            />
          </Field>
        )}
        {groove && (
          <Field label="Drum level">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={drumVolume}
              onChange={(e) => setDrumVolume(Number(e.target.value))}
              aria-label="Drums volume"
            />
          </Field>
        )}
        {groove && !sameMeter(groove.timeSignature, ts) && (
          <p className="w-full text-xs text-amber-300/90">
            {groove.name} is in {groove.timeSignature.join('/')}; this pattern
            is in {ts.join('/')}.
          </p>
        )}
        {bassLine && !sameMeter(bassLine.timeSignature, ts) && (
          <p className="w-full text-xs text-amber-300/90">
            {bassLine.name} is in {bassLine.timeSignature.join('/')}; this
            pattern is in {ts.join('/')}.
          </p>
        )}
      </section>

      {/* ── the grid ── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className={CONSOLE_LABEL}>
            Hits · {bars} bar{bars === 1 ? '' : 's'}
          </span>
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            Click to add a hit, drag to lengthen. Click a hit to select it,
            again to step its loudness. Drag to move, drag its right edge to
            resize, right-click to delete. Arrows nudge; shift-left/right
            resize; Delete removes.
          </span>
          <span className={CONSOLE_LABEL}>Zoom</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(8, cellW - 4))}
            aria-label="Zoom out"
          >
            −
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(80, cellW + 4))}
            aria-label="Zoom in"
          >
            +
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(null)}>
            Fit
          </Button>
        </div>
        {pastEnd > 0 && (
          <ConsoleCallout tone="warning">
            {pastEnd} hit{pastEnd === 1 ? ' is' : 's are'} past the last bar and
            won&rsquo;t play. Add bars to bring {pastEnd === 1 ? 'it' : 'them'}{' '}
            back.
          </ConsoleCallout>
        )}
        <CompingRoll
          hits={draft.hits}
          timeSignature={ts}
          geometry={geometry}
          cellW={cellW}
          chords={chordMarks}
          selected={selected}
          onSelect={setSelected}
          edit={edit}
          playheadQ={playheadQ === null ? null : playheadQ % geometry.totalQ}
        />
      </div>

      {/* ── selected hit ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        {sel ? (
          <>
            <Field label="Plays">
              <select
                value={sel.tones ?? 'full'}
                onChange={(e) => {
                  const tones = e.target.value as CompingTones;
                  edit((hs) =>
                    hs.map((h) =>
                      h._id === selected ? withTones(h, tones) : h,
                    ),
                  );
                }}
                className={control}
              >
                {TONE_ROWS.map((r) => (
                  <option key={r.tones} value={r.tones}>
                    {r.label} — {r.hint}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Length (beats)">
              <input
                type="number"
                min={0.05}
                step={0.05}
                value={sel.dur}
                onChange={(e) =>
                  patchSel({
                    dur: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                  })
                }
                className={`${control} w-20`}
              />
            </Field>
            <Field label={`Velocity ${Math.round(sel.velocity * 100)}`}>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={sel.velocity}
                onChange={(e) =>
                  patchSel({ velocity: parseFloat(e.target.value) })
                }
              />
            </Field>
            <span className="pb-1 text-xs tabular-nums text-white/40">
              at {sel.time}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                edit((hs) => hs.filter((h) => h._id !== sel._id));
                setSelected(null);
              }}
            >
              Delete
            </Button>
          </>
        ) : (
          <span className="text-sm italic text-muted-foreground">
            Select a hit to set what it plays, its length and velocity.
          </span>
        )}
      </section>

      {/* ── what it plays ── */}
      {harmony && chordNotes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={CONSOLE_LABEL}>
            What it plays
            {harmony.loopQ > geometry.totalQ + 1e-6
              ? ' · the pattern repeats to fill the progression'
              : ''}
          </span>
          <RealizedChords
            notes={chordNotes}
            loopQ={harmony.loopQ}
            barQ={geometry.barQ}
            pxPerQuarter={pxPerQuarter}
            ceiling={draft.ceiling}
            flats={flats}
            playheadQ={playheadQ}
          />
        </div>
      )}
    </div>
  );
};
