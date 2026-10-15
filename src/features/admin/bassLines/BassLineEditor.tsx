/* eslint-disable react/jsx-sort-props */
/**
 * One bass line: a piano roll of chord-relative roles, heard over a chart and
 * a drum groove while you edit. Ported from ICP Studio's editor and laid out
 * like the Drum Grooves designer (header, transport panel, roll).
 *
 * What the line plays over (changes, key, groove, tempo, swing) is audition
 * only and isn't saved, except the grooves it's paired with.
 */

import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Play,
  Plus,
  Redo2,
  Save,
  Square,
  Undo2,
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
  BASS_GRIDS,
  degreeInterval,
  DEGREES,
  hashSeed,
  INSTRUMENTS,
  lineBars,
  passesFor,
  GENRE_BASS_RULES,
  realizeLine,
  sameMeter,
  stackedNotes,
  timeToQuarters,
  type BassDegree,
  type BassGridId,
  type BassInstrument,
  type BassLine,
  type BassSwingOn,
} from '@/curriculum/engine/bassLines/bassLine';
import {
  chartBarQuarters,
  chordSpans,
  chordSymbol,
  guessKey,
  KEYS,
  keyPrefersFlats,
  parseChart,
  pcName,
  progressionById,
  PROGRESSIONS,
  quartersPerBar,
  realizePreset,
} from '@/curriculum/engine/bassLines/harmony';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { useUndoable } from '../drumGrooves/useUndoable';
import { UseInLessons } from '../lessonPairings/UseInLessons';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import {
  BassRoll,
  MIN_VELOCITY,
  withIds,
  withoutIds,
  type ChordMark,
  type EditorNote,
} from './BassRoll';
import { RealizedView } from './RealizedView';
import {
  CAN_WRITE_FILES,
  downloadBassLine,
  saveBassLine,
} from './bassLineFiles';
import { useBassLinePlayer } from './useBassLinePlayer';

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

type Draft = Omit<BassLine, 'notes'> & { notes: EditorNote[] };
const toDraft = (line: BassLine): Draft => ({
  ...line,
  notes: withIds(line.notes),
});
const toLine = (draft: Draft): BassLine => ({
  ...draft,
  notes: withoutIds(draft.notes),
});

interface Feel {
  tempo: number;
  swing: number;
  swingOn: BassSwingOn;
}

/**
 * The bass feel a groove suggests: its tempo, and the swing its off-beat 8ths
 * are played with. Grooves from ICP Studio carry that swing in each hit's
 * offset (a jazz ride's "and" sits 80 ticks late, a triplet), so the bass is
 * swung to land with them.
 */
export function feelFor(groove: DrumGroove | null): Feel {
  if (!groove) return { tempo: 120, swing: 50, swingOn: 'eighths' };
  if (groove.swing > 50)
    return { tempo: groove.tempo, swing: groove.swing, swingOn: 'sixteenths' };
  const late = groove.hits
    .filter((h) => h.tick % 480 === 240 && (h.offset ?? 0) > 0)
    .map((h) => h.offset ?? 0)
    .sort((a, b) => a - b);
  const offset = late.length ? late[Math.floor(late.length / 2)] : 0;
  const swing = Math.min(75, Math.round(((240 + offset) / 480) * 100));
  return { tempo: groove.tempo, swing, swingOn: 'eighths' };
}

const RULES_LABEL: Record<string, string> = {
  pop: 'Pop',
  funk: 'Funk',
  'hip-hop': 'Hip Hop',
  latin: 'Latin',
};

/** "Funk"; "free" for a genre without Walk and Approach rules. */
const rulesLabel = (genre: string | undefined) =>
  (genre && RULES_LABEL[genre]) ?? 'free';

interface Props {
  line: BassLine;
  onDuplicate: (line: BassLine) => void;
}

export const BassLineEditor: FC<Props> = ({ line: initial, onDuplicate }) => {
  const history = useUndoable<Draft>(toDraft(initial));
  const draft = history.value;
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit

  const line = useMemo(() => toLine(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(line) !== JSON.stringify(saved),
    [line, saved],
  );
  const set = useCallback(
    (patch: Partial<Draft>) => history.set((d) => ({ ...d, ...patch })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history.set],
  );
  const edit = useCallback(
    (fn: (notes: EditorNote[]) => EditorNote[], transient = false) =>
      (transient ? history.replace : history.set)((d) => ({
        ...d,
        notes: fn(d.notes),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history.set, history.replace],
  );

  // ── geometry ──
  const ts = draft.timeSignature;
  const qpb = quartersPerBar(ts);
  const bars = lineBars(draft);
  const grid =
    BASS_GRIDS.find((g) => g.id === draft.gridResolution) ?? BASS_GRIDS[0];
  const totalSteps = bars * Math.round(qpb * grid.perBeat);
  const fitW = Math.max(14, Math.min(56, Math.floor(880 / totalSteps)));
  const cellW = zoom ?? fitW;
  const lineQ = bars * qpb;

  // ── what to hear it over (not saved) ──
  const [changesMode, setChangesMode] = useState<'preset' | 'typed'>('preset');
  const [progressionId, setProgressionId] = useState(
    ts[0] === 3 ? 'turnaround' : 'jazz-blues',
  );
  const [keyPc, setKeyPc] = useState(0);
  const [typed, setTyped] = useState('| Dm7 G7 | Cmaj7 | Cm7 F7 | Bbmaj7 |');
  const progression = progressionById(progressionId);
  const parsedTyped = useMemo(() => parseChart(typed), [typed]);
  const chartBars = useMemo(
    () =>
      changesMode === 'typed'
        ? parsedTyped.bars
        : realizePreset(progression, keyPc),
    [changesMode, parsedTyped, progression, keyPc],
  );
  const key = useMemo(
    () =>
      changesMode === 'preset'
        ? { pc: keyPc, minor: Boolean(progression.minor) }
        : guessKey(chartBars),
    [changesMode, keyPc, progression, chartBars],
  );
  const flats = keyPrefersFlats(key.pc, key.minor);

  const allGrooves = useGrooveList();
  const paired = draft.grooves
    .map((id) => allGrooves.find((g) => g.id === id))
    .filter((g): g is DrumGroove => Boolean(g));
  const missingPairs = draft.grooves.filter(
    (id) => !allGrooves.some((g) => g.id === id),
  );
  // Same meter first; a 12/8 line over a 4/4 groove would drift.
  const others = allGrooves.filter(
    (g) => !draft.grooves.includes(g.id) && sameMeter(g.timeSignature, ts),
  );
  const [grooveId, setGrooveId] = useState<string>(() => paired[0]?.id ?? '');
  // Walk and Approach preview by the line's genre, else its first groove's.
  const grooveGenre = paired.find((g) => g.genre)?.genre;
  const rulesGenre = draft.genre ?? grooveGenre;
  const groove = allGrooves.find((g) => g.id === grooveId) ?? null;
  const [feel, setFeel] = useState<Feel>(() => feelFor(groove));
  const [click, setClick] = useState(true);
  const [bassVolume, setBassVolume] = useState(0.8);
  const [drumVolume, setDrumVolume] = useState(0.7);
  const player = useBassLinePlayer(bassVolume, drumVolume);

  const pickGroove = (id: string) => {
    setGrooveId(id);
    setFeel(feelFor(allGrooves.find((g) => g.id === id) ?? null));
  };

  // One pass of whichever is longer, the line or the chart (a short chart
  // gets a few varied passes), so a whole-song line is heard in full.
  const realized = useMemo(() => {
    if (!chartBars.length) return null;
    const chartQ = chartBars.length * chartBarQuarters(ts);
    const passes = Math.max(
      Math.ceil(lineQ / chartQ),
      passesFor(chartBars.length),
    );
    return realizeLine(line, chartBars, {
      timeSignature: ts,
      instrument: draft.instrument,
      passes,
      seed: hashSeed(draft.name || 'line', String(chartBars.length)),
      genre: rulesGenre,
    });
  }, [line, chartBars, ts, lineQ, draft.instrument, draft.name, rulesGenre]);

  // Chords along the top of the roll, over the line's own length.
  const chordMarks = useMemo<ChordMark[]>(() => {
    if (!chartBars.length) return [];
    const { spans, totalQuarters } = chordSpans(chartBars, ts);
    const out: ChordMark[] = [];
    for (let base = 0; base < lineQ - 1e-6; base += totalQuarters) {
      spans.forEach((s) => {
        if (base + s.start < lineQ - 1e-6)
          out.push({
            q: base + s.start,
            end: Math.min(lineQ, base + s.end),
            label: chordSymbol(s.chord, s.chord.flats ?? flats),
          });
      });
    }
    return out;
  }, [chartBars, ts, lineQ, flats]);

  const firstChord = chartBars[0]?.[0];
  const rowLabel = (degree: BassDegree) => {
    const iv =
      firstChord && !firstChord.nc
        ? degreeInterval(degree, firstChord.quality)
        : null;
    return iv === null || !firstChord
      ? null
      : pcName((firstChord.root + iv + 120) % 12, flats);
  };

  // ── audio: every edit is heard on the next pass, without stopping ──
  const playOptions = useMemo(
    () =>
      realized && {
        realized,
        instrument: draft.instrument,
        timeSignature: ts,
        groove,
        click,
        ...feel,
      },
    [realized, draft.instrument, ts, groove, click, feel],
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
    async (status?: BassLine['status']) => {
      const next = status ? { ...line, status } : line;
      setSaving(true);
      setError(null);
      try {
        await saveBassLine(next);
        if (status) set({ status });
        setSaved(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [line, set],
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

  const sel = draft.notes.find((nt) => nt._id === selected) ?? null;
  const patchSel = (p: Partial<EditorNote>) =>
    edit((ns) => ns.map((nt) => (nt._id === selected ? { ...nt, ...p } : nt)));
  const pastEnd = draft.notes.filter(
    (nt) => timeToQuarters(nt.time, ts) >= lineQ - 1e-6,
  ).length;
  const stacked = stackedNotes(line);
  const playheadQ = player.playheadQ;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to={AdminRoutes.bassLines()}>
            <ArrowLeft /> All bass lines
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
          Bass lines are repo files for now, so saving only works on the local
          dev server. Here you can audition and edit, then Export the JSON into
          src/curriculum/data/bassLines/.
        </ConsoleCallout>
      )}

      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-64 flex-1 bg-transparent text-[2rem] leading-[1.1] tracking-[-0.02em] text-white outline-none"
          aria-label="Bass line name"
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
              onClick={() => onDuplicate(line)}
              title="Save a copy under a new id"
            >
              <Copy /> Duplicate
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => downloadBassLine(line)}>
            <Download /> Export JSON
          </Button>
        )}
      </div>

      <input
        value={draft.description ?? ''}
        onChange={(e) => set({ description: e.target.value || undefined })}
        placeholder="What this line does — feel, style, where it fits"
        className={`${control} w-full`}
        aria-label="Description"
      />

      {/* ── the line ── */}
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
          {/* No upper limit: a whole song's line is just a long template. */}
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
              set({ gridResolution: e.target.value as BassGridId })
            }
            className={control}
          >
            {BASS_GRIDS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bass">
          <select
            value={draft.instrument}
            onChange={(e) =>
              set({ instrument: e.target.value as BassInstrument })
            }
            className={control}
            title={INSTRUMENTS[draft.instrument].detail}
          >
            {Object.entries(INSTRUMENTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Walk & Approach">
          <select
            value={draft.genre ?? ''}
            onChange={(e) => set({ genre: e.target.value || undefined })}
            className={control}
            title="Lessons and bands play the line by their own genre's rules; this is what the editor previews."
          >
            <option value="">As its groove ({rulesLabel(grooveGenre)})</option>
            {Object.keys(GENRE_BASS_RULES).map((g) => (
              <option key={g} value={g}>
                {rulesLabel(g)}
              </option>
            ))}
            <option value="free">Free (no genre rules)</option>
          </select>
        </Field>
        <label
          className="flex items-center gap-2 pb-1 text-sm text-white/70"
          title="Any note that lands on a chord change plays that chord's root, whatever row it's in."
        >
          <input
            type="checkbox"
            checked={draft.anchorOnChange !== false}
            onChange={(e) => set({ anchorOnChange: e.target.checked })}
          />
          Root on every chord change
        </label>
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
          kind="bass"
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
            value={changesMode}
            onChange={(e) =>
              setChangesMode(e.target.value as 'preset' | 'typed')
            }
            className={control}
          >
            <option value="preset">A progression</option>
            <option value="typed">Type them in</option>
          </select>
          {changesMode === 'preset' ? (
            <>
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
            </>
          ) : (
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              spellCheck={false}
              placeholder="| Dm7 G7 | Cmaj7 | % |"
              className={`${control} w-96 font-mono`}
              aria-label="Changes"
            />
          )}
        </Field>
        <Field label="Drums">
          <select
            value={grooveId}
            onChange={(e) => pickGroove(e.target.value)}
            className={control}
          >
            <option value="">None (click)</option>
            {paired.length > 0 && (
              <optgroup label="Paired with this line">
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
        <Field label={`Bass swing ${feel.swing}%`}>
          <input
            type="range"
            min={50}
            max={75}
            step={1}
            value={feel.swing}
            onChange={(e) =>
              setFeel({ ...feel, swing: Number(e.target.value) })
            }
            title="50 is straight, 66 a triplet feel. Picking drums sets it to match their swing; the drums keep their own."
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
        {changesMode === 'typed' && parsedTyped.bad.length > 0 && (
          <p className="w-full text-xs text-amber-300/90">
            Not chords, skipped: {parsedTyped.bad.join(' ')}
          </p>
        )}
        {groove && !sameMeter(groove.timeSignature, ts) && (
          <p className="w-full text-xs text-amber-300/90">
            {groove.name} is in {groove.timeSignature.join('/')}; this line is
            in {ts.join('/')}.
          </p>
        )}
      </section>

      {/* ── the roll ── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className={CONSOLE_LABEL}>
            Piano roll · {bars} bar{bars === 1 ? '' : 's'}
          </span>
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            Click to draw, drag to lengthen. Click a note to select it, again to
            step its loudness. Drag to move, drag its right edge to resize,
            right-click to delete. Arrows nudge; shift-left/right resize;
            shift-up/down change loudness.
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
            {pastEnd} note{pastEnd === 1 ? ' is' : 's are'} past the last bar
            and won&rsquo;t play. Add bars to bring{' '}
            {pastEnd === 1 ? 'it' : 'them'} back.
          </ConsoleCallout>
        )}
        {stacked > 0 && (
          <ConsoleCallout tone="warning">
            {stacked} note{stacked === 1 ? ' sits' : 's sit'} exactly on top of
            another in the same row, so{' '}
            {stacked === 1 ? 'it sounds' : 'they sound'} as one louder note.
            Probably a double click: drag the top one aside to see both.
          </ConsoleCallout>
        )}
        <BassRoll
          notes={draft.notes}
          timeSignature={ts}
          bars={bars}
          perBeat={grid.perBeat}
          cellW={cellW}
          chords={chordMarks}
          rowLabel={rowLabel}
          selected={selected}
          onSelect={setSelected}
          edit={edit}
          playheadQ={playheadQ === null ? null : playheadQ % lineQ}
        />
      </div>

      {/* ── selected note ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        {sel ? (
          <>
            <Field label="Role">
              <select
                value={sel.degree}
                onChange={(e) =>
                  patchSel({ degree: e.target.value as BassDegree })
                }
                className={control}
              >
                {DEGREES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} — {d.hint}
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
            <Field
              label={`Velocity ${Math.round((sel.velocity ?? 0.8) * 100)}`}
            >
              <input
                type="range"
                min={MIN_VELOCITY}
                max={1}
                step={0.01}
                value={sel.velocity ?? 0.8}
                onChange={(e) =>
                  patchSel({ velocity: parseFloat(e.target.value) })
                }
              />
            </Field>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                edit((ns) => ns.filter((nt) => nt._id !== sel._id));
                setSelected(null);
              }}
            >
              Delete
            </Button>
          </>
        ) : (
          <span className="text-sm italic text-muted-foreground">
            Select a note to set its role, length and velocity.
          </span>
        )}
      </section>

      {/* ── what it plays ── */}
      {realized && (
        <div className="flex flex-col gap-2">
          <span className={CONSOLE_LABEL}>
            What it plays
            {realized.totalQuarters > lineQ + 1e-6
              ? ' · the line repeats to fill the chart'
              : ''}
          </span>
          <RealizedView
            realized={realized}
            flats={flats}
            pxPerQuarter={cellW * grid.perBeat}
            playheadQ={playheadQ}
          />
        </div>
      )}
    </div>
  );
};
