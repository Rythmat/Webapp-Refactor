/* eslint-disable react/jsx-sort-props */
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Music2,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';
import {
  MEASURES_PER_ROW,
  MEASURE_WIDTH,
  StaffMeasure,
  TOTAL_HEIGHT,
} from '@/components/songLibrary/ChordChart';
import type {
  ChordBar,
  ChordHit,
  SongMode,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { ChordEditDialog } from './ChordEditDialog';
import { InlineNumber, InlineText, InlineTextarea } from './Editable';

/**
 * The chord chart as the student reads it, with every part of it editable.
 *
 * Bars are drawn by the same StaffMeasure the song page uses, one measure per
 * grid cell so each bar can carry its own hover toolbar — the student's version
 * packs a row of four into one <svg>, which leaves nowhere to hang controls.
 * The visual result is the same grid at the same measure width.
 */

const NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

const MINOR_MODES: SongMode[] = [
  'minor',
  'aeolian',
  'dorian',
  'phrygian',
  'locrian',
];

/** A tonic chord in the song's key — a sensible thing for a new bar to hold. */
const defaultChordHit = (
  keyRoot: number,
  mode: SongMode,
  beat: number,
  duration: number,
): ChordHit => {
  const isMinor = MINOR_MODES.includes(mode);
  return {
    degree: isMinor ? '1 min' : '1 maj',
    chordName: `${NOTE_NAMES[((keyRoot % 12) + 12) % 12]}${isMinor ? 'm' : ''}`,
    beat,
    duration,
  };
};

/** Where the next chord in a bar should land, and how long it can be. */
const nextChordSlot = (bar: ChordBar, beatsPerBar: number) => {
  if (bar.chords.length === 0) return { beat: 1, duration: beatsPerBar };
  const last = bar.chords.reduce((a, b) => (b.beat > a.beat ? b : a));
  const beat = Math.min(last.beat + last.duration, beatsPerBar);
  return { beat, duration: Math.max(1, beatsPerBar - beat + 1) };
};

type Selection = { sectionIdx: number; barIdx: number; chordIdx: number };

export const EditableChordChart: FC<{
  sections: SongSection[];
  keyRoot: number;
  mode: SongMode;
  beatsPerBar: number;
  onChange: (sections: SongSection[]) => void;
}> = ({ sections, keyRoot, mode, beatsPerBar, onChange }) => {
  const [selected, setSelected] = useState<Selection | null>(null);

  const patchSection = (index: number, next: Partial<SongSection>) =>
    onChange(
      sections.map((section, i) =>
        i === index ? { ...section, ...next } : section,
      ),
    );

  const patchBars = (
    sectionIdx: number,
    map: (bars: ChordBar[]) => ChordBar[],
  ) => patchSection(sectionIdx, { bars: map(sections[sectionIdx].bars) });

  const moveSection = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addSection = () =>
    onChange([
      ...sections,
      {
        id: `section_${sections.length + 1}`,
        label: `Section ${sections.length + 1}`,
        bars: [{ chords: [defaultChordHit(keyRoot, mode, 1, beatsPerBar)] }],
      },
    ]);

  const selectedHit =
    selected &&
    sections[selected.sectionIdx]?.bars[selected.barIdx]?.chords[
      selected.chordIdx
    ];

  return (
    <div className="flex flex-col">
      {sections.map((section, sectionIdx) => {
        const perRow = section.measuresPerRow ?? MEASURES_PER_ROW;
        const hasRepeat = (section.repeatCount ?? 1) > 1;

        return (
          <div
            key={`${section.id}_${sectionIdx}`}
            className="mb-6 rounded-xl border border-transparent p-2 transition-colors hover:border-white/[0.08]"
          >
            {/* ── Section header — the student's label pill, made editable ── */}
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-block font-bold text-white/60"
                style={{
                  fontFamily: 'serif',
                  fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
                  padding: '2px 8px',
                  border: '1px solid currentColor',
                  borderRadius: 2,
                }}
              >
                <InlineText
                  value={section.label}
                  onChange={(value) =>
                    patchSection(sectionIdx, { label: value })
                  }
                  placeholder="Section label"
                  ariaLabel={`Section ${sectionIdx + 1} label`}
                />
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] text-white/30">
                <span className="font-mono">id</span>
                <InlineText
                  value={section.id}
                  onChange={(value) =>
                    patchSection(sectionIdx, { id: value.trim() || section.id })
                  }
                  ariaLabel={`Section ${sectionIdx + 1} id`}
                  className="font-mono text-white/50"
                />
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] text-white/30">
                <Repeat className="size-3" />×
                <InlineNumber
                  value={section.repeatCount ?? 1}
                  onChange={(value) =>
                    patchSection(sectionIdx, {
                      // 1 is the default; storing it would be noise in the body.
                      repeatCount: !value || value <= 1 ? undefined : value,
                    })
                  }
                  min={1}
                  ariaLabel={`Section ${sectionIdx + 1} repeat count`}
                  className="text-white/60"
                />
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] text-white/30">
                bars/row
                <InlineNumber
                  value={section.measuresPerRow ?? MEASURES_PER_ROW}
                  onChange={(value) =>
                    patchSection(sectionIdx, {
                      measuresPerRow:
                        !value || value === MEASURES_PER_ROW
                          ? undefined
                          : value,
                    })
                  }
                  min={1}
                  max={8}
                  ariaLabel={`Section ${sectionIdx + 1} bars per row`}
                  className="text-white/60"
                />
              </span>

              <span className="ml-auto flex items-center gap-0.5">
                <IconButton
                  label={`Move ${section.label} up`}
                  disabled={sectionIdx === 0}
                  onClick={() => moveSection(sectionIdx, -1)}
                >
                  <ChevronUp className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`Move ${section.label} down`}
                  disabled={sectionIdx === sections.length - 1}
                  onClick={() => moveSection(sectionIdx, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`Delete section ${section.label}`}
                  danger
                  onClick={() =>
                    onChange(sections.filter((_, i) => i !== sectionIdx))
                  }
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </span>
            </div>

            {/* ── Bars ── */}
            <div
              className="grid gap-y-1"
              style={{
                gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
              }}
            >
              {section.bars.map((bar, barIdx) => (
                <BarCell
                  key={barIdx}
                  bar={bar}
                  barIdx={barIdx}
                  isFirst={barIdx === 0}
                  isLast={barIdx === section.bars.length - 1}
                  hasRepeat={hasRepeat}
                  onSelectChord={(hit) =>
                    setSelected({
                      sectionIdx,
                      barIdx,
                      chordIdx: bar.chords.indexOf(hit),
                    })
                  }
                  onAddChord={() => {
                    const slot = nextChordSlot(bar, beatsPerBar);
                    patchBars(sectionIdx, (bars) =>
                      bars.map((b, i) =>
                        i === barIdx
                          ? {
                              ...b,
                              chords: [
                                ...b.chords,
                                defaultChordHit(
                                  keyRoot,
                                  mode,
                                  slot.beat,
                                  slot.duration,
                                ),
                              ],
                            }
                          : b,
                      ),
                    );
                  }}
                  onDuplicate={() =>
                    patchBars(sectionIdx, (bars) => [
                      ...bars.slice(0, barIdx + 1),
                      {
                        ...bar,
                        chords: bar.chords.map((chord) => ({ ...chord })),
                      },
                      ...bars.slice(barIdx + 1),
                    ])
                  }
                  onToggleFermata={() =>
                    patchBars(sectionIdx, (bars) =>
                      bars.map((b, i) =>
                        i === barIdx
                          ? { ...b, fermata: b.fermata ? undefined : true }
                          : b,
                      ),
                    )
                  }
                  onDelete={() =>
                    patchBars(sectionIdx, (bars) =>
                      bars.filter((_, i) => i !== barIdx),
                    )
                  }
                />
              ))}

              <button
                type="button"
                aria-label={`Add bar to ${section.label}`}
                className="flex min-h-[72px] items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-xs text-white/30 transition-colors hover:border-white/40 hover:bg-white/[0.03] hover:text-white/70"
                onClick={() =>
                  patchBars(sectionIdx, (bars) => [
                    ...bars,
                    {
                      chords: [defaultChordHit(keyRoot, mode, 1, beatsPerBar)],
                    },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Bar
              </button>
            </div>

            {/* ── Pedagogical note — never lyrics ── */}
            <div className="mt-1">
              <InlineTextarea
                value={section.notes}
                onChange={(value) =>
                  patchSection(sectionIdx, { notes: value.trim() || undefined })
                }
                placeholder="Add a teaching note for this section…"
                ariaLabel={`Section ${sectionIdx + 1} note`}
                rows={2}
                className="text-[0.65rem] italic text-white/25"
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-3 text-sm text-white/40 transition-colors hover:border-white/40 hover:bg-white/[0.03] hover:text-white"
        onClick={addSection}
      >
        <Plus className="size-4" />
        Add section
      </button>

      {selected && selectedHit && (
        <ChordEditDialog
          hit={selectedHit}
          keyRoot={keyRoot}
          mode={mode}
          beatsPerBar={beatsPerBar}
          onChange={(next) =>
            patchBars(selected.sectionIdx, (bars) =>
              bars.map((bar, i) =>
                i === selected.barIdx
                  ? {
                      ...bar,
                      chords: bar.chords.map((chord, ci) =>
                        ci === selected.chordIdx ? next : chord,
                      ),
                    }
                  : bar,
              ),
            )
          }
          onDelete={() =>
            patchBars(selected.sectionIdx, (bars) =>
              bars.map((bar, i) =>
                i === selected.barIdx
                  ? {
                      ...bar,
                      chords: bar.chords.filter(
                        (_, ci) => ci !== selected.chordIdx,
                      ),
                    }
                  : bar,
              ),
            )
          }
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

/** One measure, drawn by the student's renderer, with a hover toolbar. */
const BarCell: FC<{
  bar: ChordBar;
  barIdx: number;
  isFirst: boolean;
  isLast: boolean;
  hasRepeat: boolean;
  onSelectChord: (hit: ChordHit) => void;
  onAddChord: () => void;
  onDuplicate: () => void;
  onToggleFermata: () => void;
  onDelete: () => void;
}> = ({
  bar,
  barIdx,
  isFirst,
  isLast,
  hasRepeat,
  onSelectChord,
  onAddChord,
  onDuplicate,
  onToggleFermata,
  onDelete,
}) => (
  <div className="group relative">
    <svg
      width="100%"
      viewBox={`0 0 ${MEASURE_WIDTH} ${TOTAL_HEIGHT}`}
      preserveAspectRatio="xMinYMid meet"
      style={{ color: 'var(--color-text, #e8e8f0)', display: 'block' }}
    >
      <StaffMeasure
        bar={bar}
        barIndex={barIdx}
        x={0}
        width={MEASURE_WIDTH}
        displayMode="chordName"
        isFirst={isFirst}
        hasRepeatStart={isFirst && hasRepeat}
        hasRepeatEnd={isLast && hasRepeat}
        onChordClick={onSelectChord}
      />
    </svg>

    <div className="absolute right-1 top-0 flex items-center gap-0.5 rounded-md border border-white/10 bg-[#18181b] p-0.5 opacity-0 shadow-lg transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <IconButton label={`Add chord to bar ${barIdx + 1}`} onClick={onAddChord}>
        <Plus className="size-3" />
      </IconButton>
      <IconButton label={`Duplicate bar ${barIdx + 1}`} onClick={onDuplicate}>
        <Copy className="size-3" />
      </IconButton>
      <IconButton
        label={`${bar.fermata ? 'Remove' : 'Add'} fermata on bar ${barIdx + 1}`}
        active={!!bar.fermata}
        onClick={onToggleFermata}
      >
        <Music2 className="size-3" />
      </IconButton>
      <IconButton label={`Delete bar ${barIdx + 1}`} danger onClick={onDelete}>
        <Trash2 className="size-3" />
      </IconButton>
    </div>

    {bar.chords.length === 0 && !bar.restBars && (
      <span className="pointer-events-none absolute inset-x-0 top-1 text-center text-[10px] text-white/20">
        empty bar
      </span>
    )}
  </div>
);

export const IconButton: FC<{
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}> = ({ label, onClick, children, danger, active, disabled }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    className={`rounded p-1 transition-colors disabled:opacity-20 ${
      active ? 'bg-white/15 text-white' : 'text-white/40'
    } ${danger ? 'hover:bg-red-500/15 hover:text-red-400' : 'hover:bg-white/10 hover:text-white'}`}
    onClick={onClick}
  >
    {children}
  </button>
);
