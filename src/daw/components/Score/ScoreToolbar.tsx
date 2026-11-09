import { memo, useCallback, useMemo, type ReactNode } from 'react';
import {
  Plus,
  Minus,
  Type,
  Repeat,
  Bookmark,
  Repeat2,
  Layers,
  Lock,
  GitMerge,
  Rows3,
  ChevronDown,
} from 'lucide-react';
import { useLeadSheetSections, useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import type { LeadSheetChordFormat } from '@/daw/store/uiSlice';
import type { ChordRecordMode } from '@/daw/store/prismSlice';
import {
  chordNotationLabel,
  chordNotationLockTitle,
} from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';
import { promptDialog } from '@/daw/ui/DialogHost';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { SendToSetListButton } from '../LeadSheet/SendToSetList';
import { isNotatable } from './scoreParts';

// ── The Score's toolbar (one editor, 2026-10-21) ───────────────────────────
//
// The Full score and the Lead sheet were two layouts of the Score page with
// a switch between them; they are one editor now (owner, 2026-10-21), and
// this is its one toolbar, the same over the staves and over the chord
// chart: which tracks have staves (Staves), the chords' format, the repeat
// shorthand, bars in and out, sections and repeats at the selected bar, how
// recorded chords land, then the set list. MusicXML and Print / PDF live in
// the Export dialog only (owner, 2026-10-22). With every track's staff off,
// the page is the chord chart.

const BTN =
  'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors hover:bg-white/5';
const BTN_STYLE = {
  color: 'var(--daw-text)',
  background: 'none',
  border: 'none',
};

function Divider() {
  return (
    <div
      aria-hidden
      className="mx-1 h-4 w-px shrink-0"
      style={{ backgroundColor: 'var(--daw-hairline)' }}
    />
  );
}

interface ScoreToolbarProps {
  /** The bar the selection starts at, for the bar, section and repeat tools. */
  selectedMeasureIdx: number | null;
  /**
   * The tracks with a staff on the page, top first: a bar put in or taken
   * out moves their notes with the chords.
   */
  staveTrackIds: readonly string[];
  /** What the page is doing now (note input), before the set list. */
  status?: ReactNode;
}

export const ScoreToolbar = memo(function ScoreToolbar({
  selectedMeasureIdx,
  staveTrackIds,
  status,
}: ScoreToolbarProps) {
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const setChordFormat = useStore((s) => s.setLeadSheetChordFormat);
  // Jazz / Roman decide the chord symbols; the format picker only applies to hybrid.
  const chordNotation = useChordNotation();
  const formatLocked = chordNotation !== 'hybrid';
  const insertMeasures = useStore((s) => s.insertMeasures);
  const deleteMeasures = useStore((s) => s.deleteMeasures);
  const showRepeats = useStore((s) => s.leadSheetShowRepeats);
  const setShowRepeats = useStore((s) => s.setLeadSheetShowRepeats);
  // The song's sections, as marks on the bars they start at (milestone 2.13).
  const sections = useLeadSheetSections();
  const markSectionAtBar = useStore((s) => s.markSectionAtBar);
  const removeSectionAtBar = useStore((s) => s.removeSectionAtBar);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const addRepeat = useStore((s) => s.addLeadSheetRepeat);
  const removeRepeat = useStore((s) => s.removeLeadSheetRepeat);
  const chordRecordMode = useStore((s) => s.chordRecordMode);
  const setChordRecordMode = useStore((s) => s.setChordRecordMode);

  const ids = useMemo(() => [...staveTrackIds], [staveTrackIds]);

  const toggleFormat = useCallback(() => {
    const cycle: Record<LeadSheetChordFormat, LeadSheetChordFormat> = {
      jazz: 'hybrid',
      hybrid: 'numbers',
      numbers: 'jazz',
    };
    setChordFormat(cycle[chordFormat]);
  }, [chordFormat, setChordFormat]);

  // A bar goes in after the selected one, or at the end with nothing
  // selected, so a chart can grow past its last chord (leadsheet-07). The
  // tracks with staves move with the bars.
  const handleInsertMeasure = useCallback(() => {
    withTransaction('Insert bar', () =>
      insertMeasures(
        selectedMeasureIdx === null
          ? Number.POSITIVE_INFINITY
          : selectedMeasureIdx + 1,
        1,
        ids,
      ),
    );
  }, [selectedMeasureIdx, insertMeasures, ids]);

  const handleDeleteMeasure = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    withTransaction('Delete bar', () =>
      deleteMeasures(selectedMeasureIdx, 1, ids),
    );
  }, [selectedMeasureIdx, deleteMeasures, ids]);

  const hasSectionAtSelected =
    selectedMeasureIdx !== null &&
    sections.some((s) => s.measureIdx === selectedMeasureIdx);

  const hasRepeatAtSelected =
    selectedMeasureIdx !== null &&
    repeats.some((r) => r.startMeasure === selectedMeasureIdx);

  const handleAddSection = useCallback(async () => {
    if (selectedMeasureIdx === null) return;
    const measureIdx = selectedMeasureIdx;
    const label = await promptDialog({
      title: 'Add a section',
      label: 'Section label',
      description: 'For example A, B, Intro or Bridge.',
      confirmLabel: 'Add',
      maxLength: 24,
      validate: (value) => (value.trim() ? null : 'Type a label to add it.'),
    });
    if (!label || !label.trim()) return;
    markSectionAtBar(measureIdx, label.trim());
  }, [selectedMeasureIdx, markSectionAtBar]);

  const noBar = selectedMeasureIdx === null;

  return (
    <div
      data-testid="score-toolbar"
      // Wraps rather than running under the side rail on a Chromebook.
      className="leadsheet-toolbar score-no-print flex flex-wrap items-center gap-1 border-b px-3 py-1.5"
      style={{
        borderColor: 'var(--daw-hairline)',
        backgroundColor: 'var(--daw-surface-1)',
      }}
    >
      <StavesMenu />
      <Divider />

      {/* Chord format toggle (locked to the global notation in jazz / roman) */}
      {formatLocked ? (
        <button
          className="flex h-7 cursor-default items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium"
          style={{ ...BTN_STYLE, opacity: 0.4 }}
          aria-disabled
          title={chordNotationLockTitle(chordNotation)}
        >
          <Type size={13} strokeWidth={2} />
          {chordNotationLabel(chordNotation)}
        </button>
      ) : (
        <button
          className={BTN}
          style={BTN_STYLE}
          onClick={toggleFormat}
          title={`Chord format: ${chordFormat === 'jazz' ? 'Spelled' : chordFormat === 'hybrid' ? 'Hybrid' : 'Numbers'}`}
        >
          <Type size={13} strokeWidth={2} />
          {chordFormat === 'jazz'
            ? 'Spelled'
            : chordFormat === 'hybrid'
              ? 'Hybrid'
              : 'Numbers'}
        </button>
      )}

      {/* Repeat shorthand toggle */}
      <button
        className={BTN}
        style={{ ...BTN_STYLE, opacity: showRepeats ? 1 : 0.5 }}
        onClick={() => setShowRepeats(!showRepeats)}
        aria-pressed={showRepeats}
        title={`Repeat shorthand: ${showRepeats ? 'On' : 'Off'}`}
      >
        <Repeat size={13} strokeWidth={2} />
      </button>

      <Divider />

      <button
        className={BTN}
        style={BTN_STYLE}
        onClick={handleInsertMeasure}
        title="Insert measure"
      >
        <Plus size={13} strokeWidth={2} />
        Measure
      </button>
      <button
        className={BTN}
        style={{ ...BTN_STYLE, opacity: noBar ? 0.4 : 1 }}
        onClick={handleDeleteMeasure}
        disabled={noBar}
        title="Delete selected measure"
      >
        <Minus size={13} strokeWidth={2} />
        Measure
      </button>

      <Divider />

      <button
        className={BTN}
        style={{ ...BTN_STYLE, opacity: noBar ? 0.4 : 1 }}
        onClick={
          hasSectionAtSelected
            ? () => removeSectionAtBar(selectedMeasureIdx!)
            : () => void handleAddSection()
        }
        disabled={noBar}
        title={
          hasSectionAtSelected ? 'Remove section marker' : 'Add section marker'
        }
      >
        <Bookmark size={13} strokeWidth={2} />
        {hasSectionAtSelected ? '− Section' : '+ Section'}
      </button>
      <button
        className={BTN}
        style={{ ...BTN_STYLE, opacity: noBar ? 0.4 : 1 }}
        onClick={
          hasRepeatAtSelected
            ? () => removeRepeat(selectedMeasureIdx!)
            : () =>
                addRepeat({
                  startMeasure: selectedMeasureIdx!,
                  endMeasure: selectedMeasureIdx!,
                })
        }
        disabled={noBar}
        title={
          hasRepeatAtSelected ? 'Remove repeat bracket' : 'Add repeat bracket'
        }
      >
        <Repeat2 size={13} strokeWidth={2} />
        {hasRepeatAtSelected ? '− Repeat' : '+ Repeat'}
      </button>

      <Divider />

      {/* How recorded chords land on the ones already there */}
      <div
        className="flex items-center rounded-md"
        style={{ border: '1px solid var(--daw-hairline)' }}
      >
        {(['replace', 'locked', 'merge'] as const).map((m) => (
          <button
            key={m}
            className={BTN}
            style={{
              ...BTN_STYLE,
              backgroundColor:
                chordRecordMode === m ? 'var(--daw-selected)' : 'transparent',
            }}
            onClick={() => setChordRecordMode(m as ChordRecordMode)}
            aria-pressed={chordRecordMode === m}
            title={
              m === 'replace'
                ? 'New chords overwrite existing'
                : m === 'locked'
                  ? 'Existing chords are protected'
                  : 'Merge new notes with existing chords'
            }
          >
            {m === 'replace' && <Layers size={13} strokeWidth={2} />}
            {m === 'locked' && <Lock size={13} strokeWidth={2} />}
            {m === 'merge' && <GitMerge size={13} strokeWidth={2} />}
            <span className="ml-0.5">
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {status}

      <div className="flex-1" />

      <SendToSetListButton className={BTN} style={BTN_STYLE} />
    </div>
  );
});

/**
 * Staves: which instrument tracks have a staff on the page, all by default.
 * With none, the page is the chord chart (Chords only).
 */
function StavesMenu() {
  const tracks = useStore((s) => s.tracks);
  const hidden = useStore((s) => s.scoreHiddenTrackIds);
  const setHidden = useStore((s) => s.setScoreHiddenTrackIds);
  const instruments = useMemo(() => tracks.filter(isNotatable), [tracks]);
  const shownCount = instruments.filter((t) => !hidden.includes(t.id)).length;
  const summary =
    instruments.length === 0
      ? 'Chords'
      : shownCount === 0
        ? 'Chords only'
        : shownCount === instruments.length
          ? 'All'
          : `${shownCount} of ${instruments.length}`;

  const toggle = (id: string, on: boolean) =>
    setHidden(on ? hidden.filter((h) => h !== id) : [...hidden, id]);

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className={BTN}
          style={BTN_STYLE}
          data-testid="score-staves"
          title="Which tracks have a staff; with none, the chord chart"
          aria-label={`Staves: ${summary}`}
        >
          <Rows3 size={13} strokeWidth={2} />
          Staves: {summary}
          <ChevronDown size={12} strokeWidth={2} />
        </button>
      </MenuTrigger>
      <MenuContent align="start" sideOffset={6} data-ds="v2" className="w-60">
        {instruments.length === 0 ? (
          <MenuItem disabled>No instrument tracks yet</MenuItem>
        ) : (
          instruments.map((track) => (
            <MenuCheckboxItem
              key={track.id}
              checked={!hidden.includes(track.id)}
              onCheckedChange={(on) => toggle(track.id, on === true)}
              // Stays open, to switch several in a row.
              onSelect={(e) => e.preventDefault()}
              data-staff-track={track.id}
            >
              {track.name}
            </MenuCheckboxItem>
          ))
        )}
        <MenuSeparator />
        <MenuItem
          disabled={hidden.length === 0}
          onSelect={() => setHidden([])}
          data-testid="score-staves-all"
        >
          Every track
        </MenuItem>
        <MenuItem
          disabled={instruments.length === 0 || shownCount === 0}
          onSelect={() => setHidden(instruments.map((t) => t.id))}
          data-testid="score-staves-none"
        >
          Chords only
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
