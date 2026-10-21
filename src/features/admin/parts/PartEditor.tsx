/* eslint-disable react/jsx-sort-props */
import {
  ArrowLeft,
  Circle,
  Copy,
  Download,
  FileMusic,
  Loader2,
  Play,
  Save,
  Square,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  fromMidiEvents,
  toMidiEvents,
} from '@/curriculum/engine/parts/convert';
import {
  extractFeel,
  FEEL_PROFILES,
  type FeelProfile,
} from '@/curriculum/engine/parts/feel';
import {
  canFollowChords,
  followChords,
  followsChords,
  keyNotes,
  keyShift,
  partChordAt,
  suggestStayInKey,
} from '@/curriculum/engine/parts/followChords';
import {
  barTicks,
  keyLabel,
  MODES,
  PART_INSTRUMENTS,
  PART_LEVELS,
  PART_ROLES,
  partIdFrom,
  partTicks,
  PITCH_NAMES,
  PPQ,
  resizePart,
  transposePart,
  type InstrumentPart,
  type PartInstrument,
  type PartLevel,
  type PartNote,
  type PartRole,
} from '@/curriculum/engine/parts/part';
import { useKeyDispatcher } from '@/daw/commands/dispatcher';
import { PianoRoll } from '@/daw/components/PianoRoll/PianoRoll';
import {
  PianoRollHostContext,
  type PianoRollHost,
} from '@/daw/components/PianoRoll/pianoRollHost';
import { DRUM_PADS } from '@/daw/instruments/drumKits';
import '@/daw/daw.css';
import { ApproachMenu } from '../approach/ApproachMenu';
import { LaneStrip } from '../band/LaneStrip';
import { ChartPicker } from '../chart/ChartPicker';
import {
  chosenChart,
  formatPartChords,
  OWN_CHORDS,
  parsePartChords,
  takeChordSymbols,
  type ChartChoice,
} from '../chart/chartChoice';
import { previewHarmony } from '../chordComping/compingGrid';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { useUndoable } from '../drumGrooves/useUndoable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { UndoRedo } from '../ui/UndoRedo';
import { CONSOLE_LABEL, CONSOLE_PANEL, consoleTabClass } from '../ui/styles';
import { StudioScoreBridge } from './StudioScoreBridge';
import { copiedCount, copyNotes, pasteNotes } from './noteClipboard';
import {
  clearApproach,
  describeApproach,
  layApproach,
  markApproach,
} from './partApproach';
import { downloadPartJson, downloadPartMidi } from './partFiles';
import { SOUND_OPTIONS } from './sounds';
import {
  QUANTIZE_OPTIONS,
  useLiveCapture,
  type CaptureQuantize,
} from './useLiveCapture';
import { usePartPlayer } from './usePartPlayer';

type View = 'roll' | 'staff' | 'tab';

const LOOP_LENGTHS = [1, 2, 4, 8];

const INSTRUMENT_COLOR: Record<PartInstrument, string> = {
  piano: '#60a5fa',
  bass: '#f59e0b',
  guitar: '#34d399',
  drums: '#f472b6',
};

const fieldLabel = CONSOLE_LABEL;
const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none placeholder:italic placeholder:text-white/25 focus:ring-1 focus:ring-[#60a5fa]';

const Field: FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <span className={fieldLabel}>{label}</span>
    <div className="flex items-center gap-1.5">{children}</div>
  </div>
);

const DRUM_LABELS = new Map(DRUM_PADS.map((p) => [p.note, p.label]));

const HAND_NAME = { lh: 'Left hand', rh: 'Right hand' } as const;
const HAND_SHORT = { lh: 'LH', rh: 'RH' } as const;

/** A tick as 'bar 3, beat 2' (beats of the meter's own note value). */
const barBeat = (tick: number, ts: [number, number]) => {
  const bar = barTicks(ts);
  const beat = (PPQ * 4) / ts[1];
  return `bar ${Math.floor(tick / bar) + 1}, beat ${Math.floor((tick % bar) / beat) + 1}`;
};

/**
 * Editing a lesson step's notes rather than a library part: the editor commits
 * to the lesson (onCommit) instead of saving a file.
 */
export interface LessonTarget {
  /** 'Funk L2 · B3 (LH)'. */
  label: string;
  backHref: string;
  /** Write the notes into the lesson; resolves with what happened. */
  onCommit: (part: InstrumentPart) => Promise<string>;
  /**
   * The lesson is this same page (the Music Literacy editor opens the roll
   * with a search parameter), so the content area's guard, which asks only
   * on leaving a page, cannot see Back: ask here before uncommitted notes go.
   */
  askOnBack?: boolean;
}

interface Props {
  part: InstrumentPart;
  onDuplicate: (part: InstrumentPart) => void;
  lesson?: LessonTarget;
  /**
   * Opened inside a band: Play plays the band (this part in it, as edited),
   * and every edit is handed up so the band hears it on its next pass.
   */
  band?: {
    playing: boolean;
    toggle: () => void;
    onDraft: (part: InstrumentPart) => void;
    /**
     * The band's chart: the part is shown in its key, every edit kept in
     * the part's own.
     */
    chart?: ChartChoice;
    /** File a new part as this band's, and play it in this layer. */
    adopt?: (part: InstrumentPart) => Promise<void>;
  };
}

/**
 * One part: the Studio's piano roll and Score editor on the same notes, live
 * capture from a MIDI keyboard, and everything that files it in the library —
 * instrument, role, style, level, key, length.
 */
export const PartEditor: FC<Props> = ({
  part: initial,
  onDuplicate,
  lesson,
  band,
}) => {
  const history = useUndoable<InstrumentPart>(initial);
  const store = useInstrumentStore();
  const canSave = store.canSave('instrument_part');
  const draft = history.value;
  const setDraft = history.set;
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('roll');
  const [armed, setArmed] = useState(false);
  const [overdub, setOverdub] = useState(true);
  /** When the metronome clicks: while capturing (default), always, never. */
  const [metronome, setMetronome] = useState<'capture' | 'always' | 'off'>(
    'capture',
  );
  const clickWhile = (recording: boolean) =>
    metronome === 'always' || (metronome === 'capture' && recording);
  const [quantize, setQuantize] = useState<CaptureQuantize>(120);
  const [transposeTo, setTransposeTo] = useState(initial.key.tonic);
  const player = usePartPlayer();
  const [feels, setFeels] = useState<FeelProfile[]>([...FEEL_PROFILES]);
  const feel = feels.find((f) => f.id === draft.feel);
  const feltNotes = draft.notes.filter((n) => n.offset).length;

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );
  const set = useCallback(
    (patch: Partial<InstrumentPart>) => setDraft((p) => ({ ...p, ...patch })),
    [setDraft],
  );
  const setNotes = useCallback((notes: PartNote[]) => set({ notes }), [set]);

  // ── what it plays over: its own chords, as captured, or another chart,
  // whose chords it follows (parts/followChords.ts) as it would in a band ──
  const [over, setOver] = useState<ChartChoice>({
    progression: OWN_CHORDS,
    key: initial.key.tonic,
  });
  const ts = draft.timeSignature;
  const chart = useMemo(() => chosenChart(over, ts), [over, ts]);
  // The chords field as typed; set again when undo changes the chords.
  const [chordsText, setChordsText] = useState(() =>
    formatPartChords(initial.chordSymbols),
  );
  useEffect(() => {
    setChordsText((text) =>
      JSON.stringify(parsePartChords(text)) ===
      JSON.stringify(draft.chordSymbols)
        ? text
        : formatPartChords(draft.chordSymbols),
    );
  }, [draft.chordSymbols]);
  const follows = followsChords(draft);
  const canFollow = useMemo(() => canFollowChords(draft), [draft]);
  // Which hands Stay in Key over another chart, and which look like they
  // should: a hand that holds its notes through its own chord changes.
  const hasHands = draft.notes.some((n) => n.hand);
  const lhStays = draft.stayInKey === 'lh' || draft.stayInKey === 'both';
  const rhStays = draft.stayInKey === 'rh' || draft.stayInKey === 'both';
  const setStays = (lh: boolean, rh: boolean) =>
    set({
      stayInKey: lh && rh ? 'both' : lh ? 'lh' : rh ? 'rh' : undefined,
    });
  const suggested = useMemo(() => suggestStayInKey(draft), [draft]);
  const [suggestionSeen, setSuggestionSeen] = useState(false);

  // ── in a band: shown in the band's key ──
  // The roll and staff show the part moved to the key of the band's chart,
  // as the band plays it; every edit goes back into the part's own key, so
  // a part other bands and lessons play keeps its key.
  const bandChart = useMemo(
    () => (band?.chart ? chosenChart(band.chart, ts) : null),
    [band?.chart, ts],
  );
  const viewKey = bandChart?.key ?? draft.key;
  const viewShift =
    bandChart && draft.instrument !== 'drums'
      ? keyShift(draft.key.tonic, bandChart.key.tonic)
      : 0;
  const viewNotes = useMemo(
    () =>
      viewShift
        ? draft.notes.map((n) => ({ ...n, midi: n.midi + viewShift }))
        : draft.notes,
    [draft.notes, viewShift],
  );
  const setViewNotes = useCallback(
    (notes: PartNote[]) =>
      setNotes(
        viewShift
          ? notes.map((n) => ({ ...n, midi: n.midi - viewShift }))
          : notes,
      ),
    [setNotes, viewShift],
  );
  // ── approaches marked in the roll (partApproach.ts) ──
  /** The roll forgets its selection when notes come and go under it. */
  const [rollGeneration, setRollGeneration] = useState(0);
  const viewScale = useMemo(() => keyNotes(viewKey), [viewKey]);
  /** The part's own chords where they sound, moved as the roll shows it. */
  const viewChordAt = useMemo(() => {
    const own = partChordAt(draft);
    if (!own) return undefined;
    return (tick: number) => {
      const c = own(tick);
      return {
        ...c,
        rootPc: (((c.rootPc + viewShift) % 12) + 12) % 12,
        bassPc: (((c.bassPc + viewShift) % 12) + 12) % 12,
      };
    };
  }, [draft, viewShift]);
  const approachNotes = draft.notes.filter((n) => n.approach).length;
  /** Why marking did nothing, when it didn't. */
  const [approachNote, setApproachNote] = useState<string | null>(null);
  /**
   * A new part of exactly what the band plays: this one following the
   * band's chords in its key, those chords its own — to edit note for note.
   */
  const adoptForBand = async () => {
    if (!band?.adopt || !bandChart) return;
    const harmony = previewHarmony(
      bandChart.bars,
      ts,
      draft.bars * (barTicks(ts) / PPQ),
    );
    const notes =
      harmony &&
      followChords(
        draft,
        harmony.chordAt,
        harmony.bars * barTicks(ts),
        bandChart.key,
      );
    if (!harmony || !notes) return;
    await band.adopt({
      ...draft,
      name: `${draft.name} · in ${keyLabel(bandChart.key)}`,
      status: 'draft',
      key: bandChart.key,
      bars: harmony.bars,
      // The band's chords as the copy plays them: G7 under a sus voicing
      // is Gsus4, so the copy follows other charts as the original did.
      chordSymbols: takeChordSymbols(
        bandChart.bars,
        ts,
        harmony.bars,
        bandChart.flats,
        notes.filter((n) => n.role === 'chord'),
      ),
      notes: notes.map(
        ({ source: _source, role: _role, chord: _chord, ...n }) => n,
      ),
      source: { kind: 'scratch' },
    });
  };

  /** The part as it follows the chart: null over its own chords. */
  const followed = useMemo((): InstrumentPart | null => {
    if (band || chart.own || !follows || !canFollow) return null;
    const harmony = previewHarmony(
      chart.bars,
      ts,
      draft.bars * (barTicks(ts) / PPQ),
    );
    if (!harmony) return null;
    const notes = followChords(
      draft,
      harmony.chordAt,
      harmony.bars * barTicks(ts),
      chart.key,
    );
    return notes
      ? {
          ...draft,
          bars: harmony.bars,
          notes: notes.map(
            ({ source: _source, role: _role, chord: _chord, ...n }) => n,
          ),
        }
      : null;
  }, [band, chart, follows, canFollow, draft, ts]);

  const length = partTicks(draft);
  const beyondEnd = draft.notes.filter((n) => n.tick >= length).length;
  const sounds = SOUND_OPTIONS[draft.instrument];

  // In a band, every edit goes up to it, heard on the band's next pass.
  const onBandDraft = band?.onDraft;
  useEffect(() => {
    onBandDraft?.(draft);
  }, [draft, onBandDraft]);

  // Hear every edit on the next pass: over the chart picked, except while
  // capturing, which plays the part as written, on its own clock.
  const heard = armed ? draft : (followed ?? draft);
  useEffect(() => {
    if (player.playing)
      void player.play(heard, feel, { click: clickWhile(armed) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heard, feel, metronome, armed]);

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.stop();
      setArmed(false);
    } else void player.play(heard, feel, { click: clickWhile(false) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, heard, feel, metronome]);

  /** Arm, count in a bar, then run the loop recording. */
  const record = () => {
    if (armed) {
      setArmed(false);
      return;
    }
    if (!overdub) set({ notes: [] });
    if (player.playing) {
      setArmed(true);
      return;
    }
    void player.countIn(draft, () => {
      setArmed(true);
      void player.play(overdub ? draft : { ...draft, notes: [] }, feel, {
        click: clickWhile(true),
      });
    });
  };

  const capture = useLiveCapture({
    active: armed && player.playing,
    length,
    quantize,
    currentTick: player.currentTick,
    onNote: (note) =>
      setDraft((p) => ({
        ...p,
        notes: [...p.notes, note].sort(
          (a, b) => a.tick - b.tick || a.midi - b.midi,
        ),
      })),
    monitorOn: (midi, velocity) =>
      void player.liveOn(draft.sound, midi, velocity),
    monitorOff: player.liveOff,
  });

  const save = useCallback(
    async (status?: InstrumentPart['status']) => {
      const next = status ? { ...draft, status } : draft;
      setSaving(true);
      setError(null);
      setNotice(null);
      try {
        if (lesson) {
          setNotice(await lesson.onCommit(next));
          setSaved(next);
          return;
        }
        await store.save('instrument_part', next);
        if (status) setDraft(next);
        setSaved(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [draft, setDraft, lesson, store],
  );

  // The Studio roll's own keys — Delete and Backspace remove the selected
  // notes, V/D/E pick a tool — go through the Studio's key dispatcher, which
  // only the Studio editor switches on otherwise.
  useKeyDispatcher();

  // What the roll has selected (indices into the notes), and where the
  // playhead is, for copy and paste: read when the keys go down.
  const [selection, setSelection] = useState<number[]>([]);
  // A note about marking approaches is about the selection it was for.
  useEffect(() => setApproachNote(null), [selection]);
  const [clipStatus, setClipStatus] = useState<string | null>(null);
  const pasteRef = useRef({ selection, notes: viewNotes, at: 0 });
  pasteRef.current = {
    selection,
    notes: viewNotes,
    at: player.position,
  };
  useEffect(() => {
    if (!clipStatus) return;
    const id = window.setTimeout(() => setClipStatus(null), 4000);
    return () => window.clearTimeout(id);
  }, [clipStatus]);

  // Space plays, ⌘Z/⌘⇧Z undo/redo (Roll view — the Score has its own), ⌘S
  // saves, ⌘C copies the roll's selected notes and ⌘V pastes them at the
  // playhead (noteClipboard.ts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
      const mod = e.metaKey || e.ctrlKey;
      const { selection: picked, notes, at } = pasteRef.current;
      if (mod && !typing && view === 'roll' && e.code === 'KeyC') {
        const n = copyNotes(notes, picked);
        if (!n) return;
        e.preventDefault();
        setClipStatus(
          `${n} note${n === 1 ? '' : 's'} copied · ⌘V pastes at the playhead`,
        );
      } else if (mod && !typing && view === 'roll' && e.code === 'KeyV') {
        if (!copiedCount()) return;
        e.preventDefault();
        const { notes: next, pasted } = pasteNotes(notes, at);
        if (pasted) setViewNotes(next);
        setClipStatus(
          pasted
            ? `${pasted} note${pasted === 1 ? '' : 's'} pasted at ${barBeat(at, draft.timeSignature)}`
            : 'Those notes are already there',
        );
      } else if (e.code === 'Space' && !typing && view !== 'staff') {
        e.preventDefault();
        if (band) band.toggle();
        else togglePlay();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if ((lesson || canSave) && dirty) void save();
      } else if (
        mod &&
        e.key.toLowerCase() === 'z' &&
        !typing &&
        view === 'roll'
      ) {
        // The console has no Studio undo behind the roll: this is its undo.
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    togglePlay,
    history,
    dirty,
    save,
    view,
    band,
    setViewNotes,
    draft.timeSignature,
  ]);

  // The content area's guard: leaving with unsaved edits asks first.
  useUnsavedChanges(dirty);

  const rollHost = useMemo<PianoRollHost>(
    () => ({
      rootNote: viewKey.tonic,
      mode: viewKey.mode,
      beatsPerBar: draft.timeSignature[0],
      position: player.position,
      loop: player.loop.enabled
        ? player.loop
        : { enabled: false, start: 0, end: length },
      setLoop: player.setLoop,
      seek: player.seek,
    }),
    [
      viewKey.tonic,
      viewKey.mode,
      draft.timeSignature,
      player.position,
      player.loop,
      player.setLoop,
      player.seek,
      length,
    ],
  );
  const rollEvents = useMemo(() => toMidiEvents(viewNotes), [viewNotes]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4 [contain:inline-size]">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link
            to={lesson ? lesson.backHref : AdminRoutes.parts()}
            onClick={(e) => {
              if (
                lesson?.askOnBack &&
                dirty &&
                !window.confirm(
                  'Go back without committing these notes to the lesson? Your changes here will be lost.',
                )
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft /> {lesson ? 'Back to the lesson' : 'Parts Library'}
          </Link>
        </Button>
        {lesson ? (
          <ConsoleBadge tone="info">
            Editing lesson notes · {lesson.label}
          </ConsoleBadge>
        ) : (
          <span className="tabular-nums text-xs text-white/40">{draft.id}</span>
        )}
        {!lesson && (
          <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
            {draft.status === 'live' ? 'Published' : 'Draft'}
          </ConsoleBadge>
        )}
        {draft.source.kind === 'lesson' && !lesson && (
          <span className="text-xs text-muted-foreground">
            From {draft.source.genre} L{draft.source.level} ·{' '}
            {draft.source.section}
            {draft.source.stepNumber}
          </span>
        )}
        {draft.source.kind === 'midi' && (
          <span className="text-xs text-muted-foreground">
            From {draft.source.fileName}
          </span>
        )}
      </div>

      {notice && <ConsoleCallout tone="success">{notice}</ConsoleCallout>}
      {error && <ConsoleCallout tone="danger">{error}</ConsoleCallout>}

      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-0 flex-[1_1_18rem] bg-transparent text-[2rem] leading-[1.1] tracking-[-0.02em] text-white outline-none"
          aria-label="Part name"
        />
        {band ? (
          // In a band, the band's transport: this part as edited, with it.
          <>
            <Button
              onClick={band.toggle}
              className={band.playing ? 'bg-rose-500 hover:bg-rose-400' : ''}
            >
              {band.playing ? <Square /> : <Play />}
              {band.playing ? 'Stop the band' : 'Play with the band'}
            </Button>
            {band.adopt && bandChart && follows && canFollow && (
              <Button
                variant="outline"
                onClick={() => void adoptForBand()}
                title={`A new part of exactly what the band plays: this one over the band's chords, in ${keyLabel(bandChart.key)}, to edit note for note. This part stays as it is for its other bands and lessons.`}
              >
                <Copy /> Make it this band&rsquo;s
              </Button>
            )}
          </>
        ) : (
          <>
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
              variant="outline"
              onClick={record}
              className={cn(armed && 'border-rose-500 text-rose-300')}
              title="Count in one bar, then play it in on a MIDI keyboard"
            >
              <Circle className={cn(armed && 'fill-rose-500 text-rose-500')} />
              {armed ? 'Recording' : 'Capture'}
            </Button>
          </>
        )}
        <UndoRedo history={history} />
        {lesson ? (
          <>
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {dirty ? 'Commit to lesson' : 'Committed'}
            </Button>
            {canSave && (
              <Button
                variant="ghost"
                onClick={() => onDuplicate(draft)}
                title="Keep these notes as a part in the Parts Library too"
              >
                <Copy /> Save to Library
              </Button>
            )}
          </>
        ) : canSave ? (
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
            <Button variant="ghost" onClick={() => onDuplicate(draft)}>
              <Copy /> Duplicate
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => downloadPartJson(draft)}>
            <Download /> Export JSON
          </Button>
        )}
        <Button variant="ghost" onClick={() => downloadPartMidi(draft)}>
          <FileMusic /> .mid
        </Button>
      </div>

      <input
        value={draft.description ?? ''}
        onChange={(e) => set({ description: e.target.value || undefined })}
        placeholder="What it teaches or where it comes from — style, era, reference records"
        className={`${control} w-full`}
        aria-label="Description"
      />

      {/* ── filing ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        <Field label="Instrument">
          <select
            value={draft.instrument}
            onChange={(e) => {
              const instrument = e.target.value as PartInstrument;
              set({ instrument, sound: SOUND_OPTIONS[instrument][0].value });
            }}
            className={control}
          >
            {PART_INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
          <select
            value={draft.sound}
            onChange={(e) => set({ sound: e.target.value })}
            className={control}
            aria-label="Sound"
          >
            {sounds.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
            {!sounds.some((s) => s.value === draft.sound) && (
              <option value={draft.sound}>{draft.sound}</option>
            )}
          </select>
        </Field>
        <Field label="Role">
          <select
            value={draft.role}
            onChange={(e) => set({ role: e.target.value as PartRole })}
            className={control}
          >
            {PART_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Genre / style">
          <input
            value={draft.genre ?? ''}
            onChange={(e) => set({ genre: e.target.value || undefined })}
            placeholder="funk"
            className={`${control} w-24`}
            aria-label="Genre"
          />
          <input
            value={draft.style ?? ''}
            onChange={(e) => set({ style: e.target.value || undefined })}
            placeholder="Meters, boom bap…"
            className={`${control} w-36`}
            aria-label="Style"
          />
        </Field>
        <Field label="Level">
          <select
            value={draft.level}
            onChange={(e) =>
              set({ level: Number(e.target.value) as PartLevel })
            }
            className={control}
          >
            {PART_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags">
          <input
            value={draft.tags.join(', ')}
            onChange={(e) =>
              set({
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="syncopated, octaves"
            className={`${control} w-44`}
          />
        </Field>
      </section>

      {/* ── musical shape ── */}
      <section
        className={cn(
          CONSOLE_PANEL,
          'flex flex-wrap items-end gap-x-5 gap-y-3 p-4',
        )}
      >
        <Field label="Written in">
          <select
            value={draft.key.tonic}
            onChange={(e) =>
              set({ key: { ...draft.key, tonic: Number(e.target.value) } })
            }
            className={control}
            title="Relabels the key without moving notes — set this after a MIDI import"
          >
            {PITCH_NAMES.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={draft.key.mode}
            onChange={(e) =>
              set({ key: { ...draft.key, mode: e.target.value } })
            }
            className={control}
            aria-label="Mode"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        {draft.instrument !== 'drums' && (
          <Field label="Transpose to">
            <select
              value={transposeTo}
              onChange={(e) => setTransposeTo(Number(e.target.value))}
              className={control}
              aria-label="Transpose to"
            >
              {PITCH_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={transposeTo === draft.key.tonic}
              onClick={() => setDraft((p) => transposePart(p, transposeTo))}
            >
              Move notes
            </Button>
          </Field>
        )}
        <Field label="Loop">
          <div
            role="radiogroup"
            aria-label="Loop length"
            className="flex flex-wrap gap-1.5"
          >
            {[
              ...LOOP_LENGTHS,
              ...(LOOP_LENGTHS.includes(draft.bars) ? [] : [draft.bars]),
            ].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={draft.bars === n}
                onClick={() => setDraft((p) => resizePart(p, n))}
                className={consoleTabClass(draft.bars === n, 'sm')}
              >
                {n} bar{n === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tempo">
          <input
            type="number"
            min={30}
            max={300}
            value={draft.tempo}
            onChange={(e) =>
              set({ tempo: Math.max(30, Number(e.target.value) || 100) })
            }
            className={`${control} w-16`}
          />
        </Field>
        <Field label={`Swing ${draft.swing}`}>
          <input
            type="range"
            min={50}
            max={75}
            value={draft.swing}
            onChange={(e) => set({ swing: Number(e.target.value) })}
            className="w-24 accent-white"
          />
        </Field>
        <Field label="Feel">
          <select
            value={draft.feel ?? ''}
            onChange={(e) => set({ feel: e.target.value || undefined })}
            className={control}
            title="A feel profile measured from a real player, applied to notes played as written"
          >
            <option value="">As written</option>
            {feels.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {feltNotes > 0 && (
            <>
              <Button
                size="sm"
                variant="ghost"
                title="Measure this performance's push and pull per 16th and save it as a profile other parts can wear"
                disabled={!canSave}
                onClick={async () => {
                  const name = window.prompt(
                    'Name this feel (e.g. "Samba — Bahia, 2/4")',
                    `${draft.style ?? draft.genre ?? 'Feel'} — ${draft.name}`,
                  );
                  if (!name) return;
                  const profile = extractFeel(draft.notes, {
                    id: partIdFrom(name),
                    name,
                    // A 2/4 cycle of 16ths (samba), else one beat of 16ths.
                    positions: draft.timeSignature[0] === 2 ? 8 : 4,
                    source: `${draft.id} (${draft.name})`,
                  });
                  try {
                    await store.save('feel_profile', profile);
                    setFeels((fs) => [
                      ...fs.filter((f) => f.id !== profile.id),
                      profile,
                    ]);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                Save feel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="Play every note exactly as written — the played timing is removed"
                onClick={() =>
                  setNotes(draft.notes.map(({ offset: _feel, ...n }) => n))
                }
              >
                Quantize feel ({feltNotes})
              </Button>
            </>
          )}
        </Field>
        <Field label="Chords (| between bars)">
          <input
            value={chordsText}
            onChange={(e) => {
              setChordsText(e.target.value);
              set({ chordSymbols: parsePartChords(e.target.value) });
            }}
            placeholder="Dm7 G7 | Cmaj7"
            className={`${control} w-64`}
            title="The chords it was played over, a bar each, looping: two in a bar split it (Dm7 G7), a . carries the chord before on (C . . G7). A part that names them follows any other chart."
          />
        </Field>
        {follows && (
          <Field label="Over other charts">
            {(hasHands ? (['lh', 'rh'] as const) : (['both'] as const)).map(
              (hand) => {
                const stays =
                  hand === 'lh'
                    ? lhStays
                    : hand === 'rh'
                      ? rhStays
                      : draft.stayInKey === 'both';
                return (
                  <select
                    key={hand}
                    value={stays ? 'key' : 'chords'}
                    onChange={(e) => {
                      const key = e.target.value === 'key';
                      if (hand === 'lh') setStays(key, rhStays);
                      else if (hand === 'rh') setStays(lhStays, key);
                      else setStays(key, key);
                    }}
                    className={control}
                    aria-label={
                      hand === 'both'
                        ? 'Over other charts'
                        : `${HAND_NAME[hand]} over other charts`
                    }
                    title="Follow the Chords: every note moves to the chords it plays over. Stay in Key: the same degrees of the key whatever the chord — 1–5 of the key held over a moving bass, an ostinato."
                  >
                    <option value="chords">
                      {hand === 'both' ? '' : `${HAND_SHORT[hand]}: `}Follow the
                      Chords
                    </option>
                    <option value="key">
                      {hand === 'both' ? '' : `${HAND_SHORT[hand]}: `}Stay in
                      Key
                    </option>
                  </select>
                );
              },
            )}
          </Field>
        )}
        {follows &&
          suggested &&
          suggested !== draft.stayInKey &&
          !suggestionSeen && (
            <p className="flex w-full flex-wrap items-center gap-2 text-xs text-white/70">
              {suggested === 'both'
                ? 'It keeps the same notes through every chord change.'
                : `The ${HAND_NAME[suggested].toLowerCase()} keeps the same notes through every chord change.`}
              <button
                type="button"
                className="underline"
                onClick={() =>
                  setStays(
                    suggested !== 'rh' || lhStays,
                    suggested !== 'lh' || rhStays,
                  )
                }
              >
                {suggested === 'both'
                  ? 'Stay in Key'
                  : `${HAND_NAME[suggested]}: Stay in Key`}
              </button>
              <button
                type="button"
                className="text-white/45 underline"
                onClick={() => setSuggestionSeen(true)}
              >
                Keep it following
              </button>
            </p>
          )}
      </section>

      {/* ── capture settings, shown while capture is in use ── */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={fieldLabel}>Capture</span>
        <label className="flex items-center gap-1.5 text-white/70">
          Metronome
          <select
            value={metronome}
            onChange={(e) =>
              setMetronome(e.target.value as 'capture' | 'always' | 'off')
            }
            className={control}
          >
            <option value="capture">While capturing</option>
            <option value="always">Always</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-white/70">
          <input
            type="checkbox"
            checked={overdub}
            onChange={(e) => setOverdub(e.target.checked)}
            className="accent-white"
          />
          Overdub (keep what&rsquo;s there)
        </label>
        <label className="flex items-center gap-1.5 text-white/70">
          Quantize
          <select
            value={quantize}
            onChange={(e) =>
              setQuantize(Number(e.target.value) as CaptureQuantize)
            }
            className={control}
          >
            {QUANTIZE_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {capture.error ??
            (capture.inputs.length
              ? `Listening on ${capture.inputs.join(', ')}`
              : 'No MIDI keyboard connected')}
        </span>
      </div>

      {beyondEnd > 0 && (
        <ConsoleCallout tone="warning">
          {beyondEnd} note{beyondEnd === 1 ? '' : 's'} sit past bar {draft.bars}{' '}
          and won&rsquo;t play. They&rsquo;re kept, so a longer loop or undo
          (⌘Z) brings them back.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => setNotes(draft.notes.filter((n) => n.tick < length))}
          >
            Remove them
          </button>
        </ConsoleCallout>
      )}

      {/* ── what it plays over ── */}
      {!band && follows && (
        <section
          className={cn(CONSOLE_PANEL, 'flex flex-col gap-3 p-4')}
          aria-label="What it plays over"
        >
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <ChartPicker
              value={over}
              onChange={setOver}
              timeSignature={ts}
              ownChords
            />
          </div>
          {!chart.own && !canFollow ? (
            <p className="text-xs text-amber-300/90">
              It doesn&rsquo;t say what chords it was played over, so it
              can&rsquo;t follow these: it plays as written. Write them under
              Chords above.
            </p>
          ) : followed ? (
            <>
              <p className="text-xs text-white/55">
                Play hears it over these chords in{' '}
                {PITCH_NAMES[chart.key.tonic]} {chart.key.mode}:{' '}
                {draft.stayInKey === 'both'
                  ? 'it stays in key'
                  : draft.stayInKey
                    ? `the ${HAND_NAME[draft.stayInKey].toLowerCase()} stays in key, the other follows the chords`
                    : 'it follows the chords'}
                , in its own rhythm and voicings. The roll keeps the notes as
                written.
                {armed && ' Capturing plays it as written.'}
              </p>
              <div className="relative overflow-hidden rounded-md border border-white/[0.06] bg-black/20 text-white">
                {/* The chart's chords, a bar each. */}
                <div className="flex border-b border-white/[0.06] text-xs text-white/60">
                  {takeChordSymbols(
                    chart.bars,
                    ts,
                    followed.bars,
                    chart.flats,
                  ).map((bar, b) => (
                    <span
                      key={b}
                      className="min-w-0 flex-1 truncate px-1.5 py-0.5"
                    >
                      {bar}
                    </span>
                  ))}
                </div>
                <LaneStrip
                  notes={followed.notes.map((n) => ({
                    note: n.midi,
                    onset: n.tick,
                    duration: n.duration,
                    velocity: n.velocity,
                    part: 'chords' as const,
                  }))}
                  totalTicks={partTicks(followed)}
                  barTicks={barTicks(ts)}
                  drums={false}
                  muted={false}
                  colour="#60a5fa"
                  height={72}
                />
                {player.playing && !armed && (
                  <span
                    className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
                    style={{
                      left: `${((player.position % partTicks(followed)) / partTicks(followed)) * 100}%`,
                    }}
                  />
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* ── views ── */}
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Editor view"
          className="flex flex-wrap gap-1.5"
        >
          {(
            [
              ['roll', 'Piano roll'],
              ['staff', 'Staff'],
              ['tab', 'Tab'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              disabled={id === 'tab'}
              title={
                id === 'tab' ? 'Guitar and bass tab editing is next' : undefined
              }
              onClick={() => setView(id)}
              className={cn(
                consoleTabClass(view === id, 'sm'),
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {draft.notes.length} notes ·{' '}
          {approachNotes > 0 && `${approachNotes} approach notes · `}
          {bandChart && viewKey.tonic !== draft.key.tonic
            ? `shown in ${keyLabel(viewKey)}, the band’s key (kept in ${keyLabel(draft.key)})`
            : keyLabel(draft.key)}{' '}
          ·{' '}
          {view === 'staff'
            ? 'the Studio’s Score editor — click a note, then type or use the palettes'
            : 'draw with the pencil, drag to move, drag edges to resize; Select and drag a box round notes, then Delete, or ⌘C and ⌘V at the playhead'}
        </span>
        {clipStatus && (
          <span role="status" className="ml-auto text-xs text-white/70">
            {clipStatus}
          </span>
        )}
      </div>

      {/* ── approaches: the notes selected in the roll ── */}
      {view === 'roll' && follows && selection.length > 0 && (
        <section
          className={cn(CONSOLE_PANEL, 'flex flex-col gap-2 p-3')}
          aria-label="Approaches"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={CONSOLE_LABEL}>{selection.length} selected</span>
            {describeApproach(viewNotes, selection) && (
              <span className="text-xs text-white/70">
                an approach: {describeApproach(viewNotes, selection)}
              </span>
            )}
            <span className="text-xs text-white/55">
              Mark as an approach into the hand&rsquo;s next chord:
            </span>
            {(
              [
                ['chromatic', 'key', 'Chromatic'],
                ['diatonic', 'key', 'Diatonic to the key'],
                ['diatonic', 'goal', 'Diatonic to the goal'],
              ] as const
            ).map(([motion, scale, label]) => (
              <Button
                key={label}
                size="sm"
                variant="outline"
                onClick={() => {
                  const marked = markApproach(
                    viewNotes,
                    selection,
                    motion,
                    scale,
                    viewScale,
                    viewChordAt,
                  );
                  if (selection.some((i) => marked[i].approach))
                    setViewNotes(marked);
                  else
                    setApproachNote(
                      'Nothing to lead into: select only the approach notes, and leave the chord they lead into unselected.',
                    );
                }}
                title="Each note keeps the distance it was played at from the chord it leads into, wherever that chord goes"
              >
                {label}
              </Button>
            ))}
            {describeApproach(viewNotes, selection) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setViewNotes(clearApproach(viewNotes, selection))
                }
              >
                Not an approach
              </Button>
            )}
          </div>
          {approachNote && (
            <p className="text-xs text-amber-300/90">{approachNote}</p>
          )}
          <ApproachMenu
            noun="chord"
            defaultQ={0.5}
            onApply={(choice, lengthQ) => {
              setViewNotes(
                layApproach(
                  viewNotes,
                  selection,
                  choice,
                  Math.round(lengthQ * PPQ),
                  length,
                  viewScale,
                  viewChordAt,
                ),
              );
              setRollGeneration((g) => g + 1);
            }}
          />
        </section>
      )}

      <div className="daw-root h-[560px] overflow-hidden rounded-lg border border-white/[0.08]">
        {view === 'roll' && (
          <PianoRollHostContext.Provider value={rollHost}>
            <div className="flex h-full flex-col">
              <PianoRoll
                events={rollEvents}
                clipStartTick={0}
                timelineStartTick={0}
                clipColor={INSTRUMENT_COLOR[draft.instrument]}
                onChange={(events) =>
                  setViewNotes(fromMidiEvents(events, viewNotes))
                }
                noteLabels={
                  draft.instrument === 'drums' ? DRUM_LABELS : undefined
                }
                onAuditionNote={(note, velocity) =>
                  void player.audition(draft.sound, note, velocity)
                }
                onSelectionChange={setSelection}
                clipId={`${draft.id}:${rollGeneration}`}
                loopScope="editor"
              />
            </div>
          </PianoRollHostContext.Provider>
        )}
        {view === 'staff' && (
          <div className="h-full overflow-auto">
            <StudioScoreBridge
              part={
                viewShift || bandChart
                  ? { ...draft, key: viewKey, notes: viewNotes }
                  : draft
              }
              onNotes={setViewNotes}
            />
          </div>
        )}
      </div>
    </div>
  );
};
