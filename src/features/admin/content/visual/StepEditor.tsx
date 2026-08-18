/* eslint-disable react/jsx-sort-props */
import { Trash2 } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import { midiToNoteLabel } from '@/components/songLibrary/ChordDiagramCard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import type {
  ActivityStepV2,
  HandConfig,
  StyleSubProfile,
  TargetNote,
} from '@/curriculum/types/activity.v2';
import {
  DetailCell,
  InlineNumber,
  InlineSelect,
  InlineTagList,
  InlineText,
  InlineTextarea,
} from './Editable';
import { IconButton } from './EditableChordChart';
import {
  ACTIVITY_PRESETS,
  applyPreset,
  PRESET_BY_ID,
  presetForStep,
  type ActivityPresetId,
} from './activityPresets';

/**
 * Everything about one step of a lesson: what the student is asked to do, and
 * the notes or scale it covers.
 *
 * The activity picker at the top is the load-bearing control — it writes
 * assessment, backing parts and instrument config together (see
 * activityPresets.ts). What follows refines that choice: an explicit note list
 * if the step has fixed material, or a scale if the engine should generate it.
 */

const TICKS_PER_QUARTER = 480;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;

const SCALE_OPTIONS = Object.keys(SCALES).sort();

const HAND_CONFIGS: HandConfig[] = [
  'lh_bass_rh_chords',
  'lh_bass_rh_melody',
  'lh_chords_rh_melody',
  'two_hand_comping',
  'two_hand_comping_genre_pop',
  'lh_rootless_rh_melody',
  'open',
];

const STYLE_PROFILES: StyleSubProfile[] = [
  'l1a',
  'l1b',
  'l2a',
  'l2b',
  'l3a',
  'l3b',
];

const ENGINE_PARTS = ['melody', 'chords', 'bass', 'drums'] as const;
const STUDENT_PARTS = ['melody', 'chords', 'bass'] as const;

/** Radix Select has no empty-string option, so "unset" needs a sentinel. */
const ANY_HAND = '__any';

/** "bar 2 · beat 3" from a tick offset — ticks alone are unreadable. */
const tickLabel = (ticks: number) => {
  const bar = Math.floor(ticks / TICKS_PER_BAR) + 1;
  const beat = (ticks % TICKS_PER_BAR) / TICKS_PER_QUARTER + 1;
  return `bar ${bar} · beat ${beat % 1 === 0 ? beat : beat.toFixed(2)}`;
};

export const StepEditor: FC<{
  step: ActivityStepV2;
  onChange: (step: ActivityStepV2) => void;
}> = ({ step, onChange }) => {
  const patch = (next: Partial<ActivityStepV2>) =>
    onChange({ ...step, ...next });

  const presetId = presetForStep(step);
  const preset = PRESET_BY_ID[presetId];
  const notes = step.targetNotes ?? [];

  return (
    <div className="flex flex-col gap-5 border-t border-white/[0.06] bg-black/20 p-4">
      {/* ── What kind of activity this is ── */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          Activity
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === presetId}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                option.id === presetId
                  ? 'border-[#60a5fa66] bg-[#60a5fa1a] text-[#93c5fd]'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white'
              }`}
              onClick={() =>
                onChange(applyPreset(step, option.id as ActivityPresetId))
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/35">
          {preset.blurb}
        </p>
      </section>

      {/* ── Text the student reads ── */}
      <section className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <DetailCell
          label="Step name (shown as the heading)"
          className="md:col-span-2"
        >
          <InlineText
            value={step.activity}
            onChange={(value) => patch({ activity: value })}
            placeholder="A1.1: D Minor Pentatonic Ascending (Out of Time)"
            ariaLabel="Step name"
            className="text-base font-medium text-white"
          />
        </DetailCell>
        <DetailCell label="Subsection">
          <InlineText
            value={step.subsection}
            onChange={(value) => patch({ subsection: value })}
            placeholder="Listen & Learn"
            ariaLabel="Subsection"
          />
        </DetailCell>
        <DetailCell label="Module">
          <InlineText
            value={step.module}
            onChange={(value) => patch({ module: value })}
            placeholder="Melody"
            ariaLabel="Module"
          />
        </DetailCell>
        <DetailCell label="Direction" className="md:col-span-2">
          <InlineTextarea
            value={step.direction}
            onChange={(value) => patch({ direction: value || undefined })}
            placeholder="Tell the student what to do…"
            ariaLabel="Direction"
            rows={2}
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Success feedback" className="md:col-span-2">
          <InlineText
            value={step.successFeedback}
            onChange={(value) => patch({ successFeedback: value })}
            placeholder="Nice work!"
            ariaLabel="Success feedback"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Tag (progress key — must be unique)">
          <InlineText
            value={step.tag}
            onChange={(value) => patch({ tag: value })}
            placeholder="funk_l1_a1_1"
            ariaLabel="Tag"
            className="font-mono text-xs"
          />
        </DetailCell>
        <DetailCell label="Style ref">
          <InlineText
            value={step.styleRef}
            onChange={(value) => patch({ styleRef: value })}
            placeholder="l1a"
            ariaLabel="Style ref"
            className="font-mono text-xs"
          />
        </DetailCell>
      </section>

      {/* ── The material: a scale, explicit notes, or both ── */}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          Notes &amp; scale
        </h4>

        <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <DetailCell label="Scale">
            <div className="flex items-center gap-2">
              <InlineSelect
                value={step.scaleId ?? ''}
                onChange={(value) =>
                  patch({ scaleId: value, scaleIntervals: SCALES[value] })
                }
                options={SCALE_OPTIONS}
                placeholder="Inherit from level"
                ariaLabel="Scale"
                className="text-sm"
              />
              {step.scaleId && (
                <button
                  type="button"
                  className="text-xs text-white/30 transition-colors hover:text-white/70"
                  onClick={() =>
                    patch({ scaleId: undefined, scaleIntervals: undefined })
                  }
                >
                  clear
                </button>
              )}
            </div>
          </DetailCell>
          <DetailCell label="Intervals">
            <span className="font-mono text-xs text-white/50">
              {(step.scaleIntervals ?? []).join(' · ') || '—'}
            </span>
          </DetailCell>
          <DetailCell label="Chord symbols (one per bar)">
            <InlineTagList
              values={step.chordSymbols ?? []}
              onChange={(values) =>
                patch({ chordSymbols: values.length ? values : undefined })
              }
              addLabel="Chord"
              ariaLabel="Chord symbols"
            />
          </DetailCell>
          <DetailCell label="Groove override">
            <InlineText
              value={step.grooveId}
              onChange={(value) =>
                patch({ grooveId: value.trim() || undefined })
              }
              placeholder="inherit"
              ariaLabel="Groove id"
              className="font-mono text-xs"
            />
          </DetailCell>
        </div>

        <TargetNoteEditor
          notes={notes}
          onChange={(next) =>
            patch({ targetNotes: next.length ? next : undefined })
          }
        />
      </section>

      {/* ── Engine settings the chosen activity brought with it ── */}
      {step.backing_parts && (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
            Backing band
          </h4>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <PartToggles
              label="Engine plays"
              options={ENGINE_PARTS}
              selected={step.backing_parts.engine_generates}
              onChange={(values) =>
                patch({
                  backing_parts: {
                    ...step.backing_parts!,
                    engine_generates:
                      values as typeof step.backing_parts.engine_generates,
                  },
                })
              }
            />
            <PartToggles
              label="Student plays"
              options={STUDENT_PARTS}
              selected={step.backing_parts.student_plays}
              onChange={(values) =>
                patch({
                  backing_parts: {
                    ...step.backing_parts!,
                    student_plays:
                      values as typeof step.backing_parts.student_plays,
                  },
                })
              }
            />
          </div>
        </section>
      )}

      {step.instrument_config && (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
            Hands
          </h4>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <DetailCell label="Hand config">
              <InlineSelect
                value={step.instrument_config.hand_config}
                onChange={(value) =>
                  patch({
                    instrument_config: {
                      ...step.instrument_config!,
                      hand_config: value as HandConfig,
                    },
                  })
                }
                options={HAND_CONFIGS}
                ariaLabel="Hand config"
                className="text-sm"
              />
            </DetailCell>
            <DetailCell label="Left hand">
              <InlineSelect
                value={step.instrument_config.lh_role}
                onChange={(value) =>
                  patch({
                    instrument_config: {
                      ...step.instrument_config!,
                      lh_role: value as 'bass' | 'chords' | 'open',
                    },
                  })
                }
                options={['bass', 'chords', 'open']}
                ariaLabel="Left hand role"
                className="text-sm"
              />
            </DetailCell>
            <DetailCell label="Right hand">
              <InlineSelect
                value={step.instrument_config.rh_role}
                onChange={(value) =>
                  patch({
                    instrument_config: {
                      ...step.instrument_config!,
                      rh_role: value as 'chords' | 'melody' | 'open',
                    },
                  })
                }
                options={['chords', 'melody', 'open']}
                ariaLabel="Right hand role"
                className="text-sm"
              />
            </DetailCell>
            <DetailCell label="Style profile">
              <InlineSelect
                value={step.instrument_config.style_ref}
                onChange={(value) =>
                  patch({
                    instrument_config: {
                      ...step.instrument_config!,
                      style_ref: value as StyleSubProfile,
                    },
                  })
                }
                options={STYLE_PROFILES}
                ariaLabel="Style profile"
                className="text-sm"
              />
            </DetailCell>
          </div>
        </section>
      )}
    </div>
  );
};

/** Multi-select as toggle chips — shorter than four checkboxes and a legend. */
const PartToggles: FC<{
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}> = ({ label, options, selected, onChange }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-white/30">
      {label}
    </div>
    <div className="mt-1 flex gap-1">
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              on
                ? 'border-[#60a5fa66] bg-[#60a5fa1a] text-[#93c5fd]'
                : 'border-white/10 text-white/35 hover:text-white/80'
            }`}
            onClick={() =>
              onChange(
                on
                  ? selected.filter((value) => value !== option)
                  : [...selected, option],
              )
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * The step's note material, added by playing the keyboard.
 *
 * Clicking a key appends a quarter note after the last one, or stacks it on the
 * same onset when "as chord" is on. Onset and length stay editable per row,
 * because rhythm is the part a keyboard click cannot express.
 */
const TargetNoteEditor: FC<{
  notes: TargetNote[];
  onChange: (notes: TargetNote[]) => void;
}> = ({ notes, onChange }) => {
  const [asChord, setAsChord] = useState(false);

  const range = useMemo(() => {
    if (notes.length === 0) return { startC: 3, endC: 5 };
    const midis = notes.map((note) => note.midi);
    return {
      startC: Math.max(0, Math.floor(Math.min(...midis) / 12) - 1 - 1),
      endC: Math.min(8, Math.floor(Math.max(...midis) / 12) - 1 + 1),
    };
  }, [notes]);

  const playing: PlaybackEvent[] = notes.map((note, i) => ({
    id: `target_${i}`,
    type: 'note',
    midi: note.midi,
    time: 0,
    duration: 1,
    velocity: 0.8,
  }));

  const addNote = (midi: number) => {
    const last = notes[notes.length - 1];
    const onset =
      !last || asChord ? (last?.onset ?? 0) : last.onset + last.duration;
    onChange([...notes, { midi, onset, duration: TICKS_PER_QUARTER }]);
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-white/30">
          Target notes — click the keyboard to add
        </span>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/40">
            <input
              type="checkbox"
              checked={asChord}
              onChange={(e) => setAsChord(e.target.checked)}
              className="size-3 accent-[#60a5fa]"
            />
            add as chord (same onset)
          </label>
          {notes.length > 0 && (
            <button
              type="button"
              className="text-xs text-white/30 transition-colors hover:text-red-400"
              onClick={() => onChange([])}
            >
              clear all
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 90 }}>
        <PianoKeyboard
          startC={range.startC}
          endC={range.endC}
          playingNotes={playing}
          onKeyClick={addNote}
          useContextNotes={false}
        />
      </div>

      {notes.length === 0 ? (
        <p className="mt-2 text-xs text-white/25">
          No explicit notes — the engine generates material from the scale
          above.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {notes.map((note, index) => (
            <li
              key={index}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-black/20 px-2 py-1 text-xs text-white/60"
            >
              <span className="w-12 font-medium text-white">
                {midiToNoteLabel(note.midi)}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-white/30">start</span>
                <InlineNumber
                  value={note.onset}
                  onChange={(value) =>
                    onChange(
                      notes.map((n, i) =>
                        i === index ? { ...n, onset: value ?? 0 } : n,
                      ),
                    )
                  }
                  min={0}
                  step={120}
                  ariaLabel={`Note ${index + 1} onset in ticks`}
                />
                <span className="text-white/25">({tickLabel(note.onset)})</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-white/30">length</span>
                <InlineNumber
                  value={note.duration}
                  onChange={(value) =>
                    onChange(
                      notes.map((n, i) =>
                        i === index
                          ? { ...n, duration: value ?? TICKS_PER_QUARTER }
                          : n,
                      ),
                    )
                  }
                  min={1}
                  step={120}
                  ariaLabel={`Note ${index + 1} duration in ticks`}
                />
              </span>
              <InlineSelect
                value={note.hand ?? ANY_HAND}
                onChange={(value) =>
                  onChange(
                    notes.map((n, i) =>
                      i === index
                        ? {
                            ...n,
                            // Only the D-section grand staff reads `hand`;
                            // elsewhere leaving it unset is correct.
                            hand:
                              value === ANY_HAND
                                ? undefined
                                : (value as 'lh' | 'rh'),
                          }
                        : n,
                    ),
                  )
                }
                options={[
                  { value: ANY_HAND, label: 'either hand' },
                  { value: 'lh', label: 'left hand' },
                  { value: 'rh', label: 'right hand' },
                ]}
                ariaLabel={`Note ${index + 1} hand`}
                className="text-xs"
              />
              <span className="ml-auto">
                <IconButton
                  label={`Remove note ${index + 1}`}
                  danger
                  onClick={() => onChange(notes.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-3" />
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
