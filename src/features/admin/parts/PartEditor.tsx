/* eslint-disable react/jsx-sort-props */
import {
  ArrowLeft,
  Circle,
  Copy,
  Download,
  FileMusic,
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
  keyLabel,
  MODES,
  PART_INSTRUMENTS,
  PART_LEVELS,
  PART_ROLES,
  partIdFrom,
  partTicks,
  PITCH_NAMES,
  resizePart,
  transposePart,
  type InstrumentPart,
  type PartInstrument,
  type PartLevel,
  type PartNote,
  type PartRole,
} from '@/curriculum/engine/parts/part';
import { PianoRoll } from '@/daw/components/PianoRoll/PianoRoll';
import {
  PianoRollHostContext,
  type PianoRollHost,
} from '@/daw/components/PianoRoll/pianoRollHost';
import { DRUM_PADS } from '@/daw/instruments/drumKits';
import '@/daw/daw.css';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { useUndoable } from '../drumGrooves/useUndoable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_PANEL, consoleTabClass } from '../ui/styles';
import { StudioScoreBridge } from './StudioScoreBridge';
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
}

interface Props {
  part: InstrumentPart;
  onDuplicate: (part: InstrumentPart) => void;
  lesson?: LessonTarget;
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

  const length = partTicks(draft);
  const beyondEnd = draft.notes.filter((n) => n.tick >= length).length;
  const sounds = SOUND_OPTIONS[draft.instrument];

  // Hear every edit on the next pass.
  useEffect(() => {
    if (player.playing) void player.play(draft, feel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, feel]);

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.stop();
      setArmed(false);
    } else void player.play(draft, feel);
  }, [player, draft, feel]);

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
      void player.play(overdub ? draft : { ...draft, notes: [] }, feel);
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

  // Space plays, ⌘Z/⌘⇧Z undo/redo (Roll view — the Score has its own), ⌘S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === 'Space' && !typing && view !== 'staff') {
        e.preventDefault();
        togglePlay();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if ((lesson || canSave) && dirty) void save();
      } else if (
        mod &&
        e.key.toLowerCase() === 'z' &&
        !typing &&
        view === 'roll'
      ) {
        // The roll handles its own keys when focused; this catches the rest.
        if (target.closest('.daw-root')) return;
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, history, dirty, save, view]);

  // The content area's guard: leaving with unsaved edits asks first.
  useUnsavedChanges(dirty);

  const rollHost = useMemo<PianoRollHost>(
    () => ({
      rootNote: draft.key.tonic,
      mode: draft.key.mode,
      beatsPerBar: draft.timeSignature[0],
      position: player.position,
      loop: player.loop.enabled
        ? player.loop
        : { enabled: false, start: 0, end: length },
      setLoop: player.setLoop,
      seek: player.seek,
    }),
    [
      draft.key,
      draft.timeSignature,
      player.position,
      player.loop,
      player.setLoop,
      player.seek,
      length,
    ],
  );
  const rollEvents = useMemo(() => toMidiEvents(draft.notes), [draft.notes]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4 [contain:inline-size]">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to={lesson ? lesson.backHref : AdminRoutes.parts()}>
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
        <Button
          size="icon"
          variant="ghost"
          onClick={history.undo}
          disabled={!history.canUndo}
          aria-label="Undo"
        >
          <Undo2 />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={history.redo}
          disabled={!history.canRedo}
          aria-label="Redo"
        >
          <Redo2 />
        </Button>
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
        <Field label="Chords (one per bar)">
          <input
            value={(draft.chordSymbols ?? []).join(' ')}
            onChange={(e) => {
              const chords = e.target.value.split(/\s+/).filter(Boolean);
              set({ chordSymbols: chords.length ? chords : undefined });
            }}
            placeholder="Dm9 G13"
            className={`${control} w-44`}
          />
        </Field>
      </section>

      {/* ── capture settings, shown while capture is in use ── */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={fieldLabel}>Capture</span>
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
          {draft.notes.length} notes · {keyLabel(draft.key)} ·{' '}
          {view === 'staff'
            ? 'the Studio’s Score editor — click a note, then type or use the palettes'
            : 'draw with the pencil, drag to move, drag edges to resize'}
        </span>
      </div>

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
                  setNotes(fromMidiEvents(events, draft.notes))
                }
                noteLabels={
                  draft.instrument === 'drums' ? DRUM_LABELS : undefined
                }
                onAuditionNote={(note, velocity) =>
                  void player.audition(draft.sound, note, velocity)
                }
                loopScope="editor"
              />
            </div>
          </PianoRollHostContext.Provider>
        )}
        {view === 'staff' && (
          <div className="h-full overflow-auto">
            <StudioScoreBridge part={draft} onNotes={setNotes} />
          </div>
        )}
      </div>
    </div>
  );
};
