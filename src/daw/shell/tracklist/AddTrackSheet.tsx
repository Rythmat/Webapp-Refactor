import {
  AudioWaveform,
  ChevronLeft,
  Disc3,
  Drum,
  FileUp,
  Grid3x3,
  Guitar,
  KeyboardMusic,
  LibraryBig,
  Mic,
  Music2,
  Piano,
  Plug,
  Scissors,
  SlidersHorizontal,
  Speaker,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '@/components/utilities';
import { addInstrumentTrack } from '@/daw/commands/trackCommands';
import {
  pickerFamilies,
  type SimpleInstrument,
} from '@/daw/instruments/simpleInstruments';
import { pickAndImportMidi } from '@/daw/midi/importMidiToTracks';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { Chip } from '@/daw/ui/Chip';
import { DawDialog } from '@/daw/ui/DawDialog';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { addTrackFrom, useAddTrackSheet } from './addTrack';
import { InstrumentPicker } from './InstrumentPicker';
import {
  categoryOf,
  choiceOf,
  TRACK_CATEGORIES,
  type TrackCategory,
  type TrackCategoryId,
  type TrackChoice,
  type TrackChoiceId,
} from './trackTemplates';

// ── The Add-track picker (milestones 2.6 and 2.14) ─────────────────────────
//
// '+ Add track' opens this dialog in two steps. First, eight categories as
// tiles, each with a line saying what it is for, in a grid that wraps so
// nothing runs off a Chromebook's screen (timeline-27, fx-mixer-24). A
// category with one engine adds its track at once and closes; Keys, Drums
// and the amp open a second step with their choices (Drums: Drum grid or
// Grooves), Instruments the simple instrument picker (its families, then
// the instrument: the beginner's plain way to a track on, say, a trumpet),
// and 'All tracks' goes back. Under the categories, a chip row
// holds Import MIDI file… (a Synth track per track of the file; it never
// makes an empty track) and Browse the library (the Library panel, ready to
// search).
//
// Focus starts on the first tile, moves to the first choice on the second
// step and back to the category's tile on the way back. Escape closes the
// dialog on either step, and the next open starts on the categories.

const CATEGORY_ICON: Record<TrackCategoryId, ReactNode> = {
  keys: <Piano />,
  drums: <Drum />,
  bass: <Guitar />,
  synth: <AudioWaveform />,
  instruments: <Music2 />,
  sampler: <Scissors />,
  voice: <Mic />,
  amp: <Plug />,
};

const CHOICE_ICON: Record<TrackChoiceId, ReactNode> = {
  piano: <Piano />,
  'electric-piano': <KeyboardMusic />,
  organ: <SlidersHorizontal />,
  'drum-grid': <Grid3x3 />,
  grooves: <Disc3 />,
  bass: <Guitar />,
  synth: <AudioWaveform />,
  instruments: <Music2 />,
  sampler: <Scissors />,
  voice: <Mic />,
  guitar: <Guitar />,
  'bass-amp': <Speaker />,
};

/** Four tiles a row at the dialog's 720 px, fewer on a narrow window. */
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2';

const TILE = cn(
  'flex min-h-[88px] flex-col items-start gap-1 rounded-[var(--daw-radius-md)] border border-daw-hairline bg-daw-surface-2 p-3 text-left',
  'hover:border-daw-outline hover:bg-daw-hover',
  '[&_svg]:size-5 [&_svg]:text-daw-text-2',
  TRANSITION,
  FOCUS_RING,
);

const CHIP_BUTTON = cn('hover:bg-daw-hover hover:text-daw-text', TRANSITION);

function Tile({
  anchor,
  pick,
  icon,
  label,
  about,
  onClick,
  tileRef,
}: {
  /** The lesson anchor after 'add-track-'. */
  anchor: string;
  /** Which tile this is, for focus: 'category:<id>' or 'choice:<id>'. */
  pick: string;
  icon: ReactNode;
  label: string;
  about: string;
  onClick(): void;
  tileRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={tileRef}
      type="button"
      className={TILE}
      data-tutorial-id={`add-track-${anchor}`}
      data-pick={pick}
      onClick={onClick}
    >
      {icon}
      <span className={cn(TYPE_CLASS.body, 'font-bold text-daw-text')}>
        {label}
      </span>
      <span
        data-testid="add-track-about"
        className={cn(TYPE_CLASS.label, 'text-daw-text-3')}
      >
        {about}
      </span>
    </button>
  );
}

/** A category's only choice, when it has just one (it adds at once). */
const onlyChoice = (category: TrackCategory): TrackChoice | null =>
  category.choices.length === 1 ? choiceOf(category.choices[0]) : null;

/**
 * Focuses the Library's search once the picker has closed and the panel's
 * lazy body has rendered. The dialog gives focus back to its opener as it
 * goes, a moment after it unmounts (it closes at once since its exit fade
 * went, 2.11), so the search keeps being given focus for a few frames after
 * it first gets it; it gives up after about fifteen seconds (the Library's
 * chunk may still be loading on a slow Chromebook).
 */
function focusLibrarySearch(framesLeft = 900, wasClosed = false, held = 0) {
  requestAnimationFrame(() => {
    const closed = !document.querySelector('[data-testid="add-track-sheet"]');
    const search = document.querySelector<HTMLElement>(
      '[data-testid="library-search"]',
    );
    if (closed && wasClosed && search) {
      if (document.activeElement !== search) search.focus();
      // Held for a few frames: the dialog's focus return comes after.
      if (held < 6) focusLibrarySearch(framesLeft - 1, true, held + 1);
      return;
    }
    if (framesLeft > 0) focusLibrarySearch(framesLeft - 1, closed, held);
  });
}

export function AddTrackSheet() {
  const open = useAddTrackSheet((s) => s.open);
  const setOpen = useAddTrackSheet((s) => s.setOpen);
  // The category whose choices show, or null for the categories.
  const [step, setStep] = useState<TrackCategoryId | null>(null);
  // Each open starts on the categories. Reset as it opens, not as it
  // closes, so the dialog fading out keeps showing the step it was on.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && step !== null) setStep(null);
  }

  const first = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const headingId = useId();
  // The tile (its data-pick) that takes focus once a step has rendered, or
  // 'picker' for the instrument picker's open family.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const pick = focusNext.current;
    focusNext.current = null;
    if (!pick) return;
    body.current
      ?.querySelector<HTMLElement>(
        pick === 'picker'
          ? '[role="tab"][data-state="active"]'
          : `[data-pick="${pick}"]`,
      )
      ?.focus();
  }, [step]);

  const add = (choice: TrackChoice) => {
    // At the track limit addTrack says so, and the picker stays open.
    if (addTrackFrom(choice)) setOpen(false);
  };

  // The picker's instrument, on a new track named after it, selected, with
  // the dock on its Instrument tab (not during a lesson, as addTrackFrom).
  const addInstrument = (item: SimpleInstrument) => {
    // At the track limit addTrack says so, and the picker stays open.
    if (!addInstrumentTrack(item.id)) return;
    const s = useStore.getState();
    if (s.activeTutorialId === null) s.setChannelStripTab('controls');
    setOpen(false);
  };

  const openCategory = (category: TrackCategory) => {
    if (category.picker) {
      focusNext.current = 'picker';
      setStep(category.id);
      return;
    }
    const only = onlyChoice(category);
    if (only) {
      add(only);
      return;
    }
    focusNext.current = `choice:${category.choices[0]}`;
    setStep(category.id);
  };

  const back = () => {
    focusNext.current = `category:${step}`;
    setStep(null);
  };

  const importMidi = () => {
    setOpen(false);
    pickAndImportMidi();
  };

  const browse = () => {
    setOpen(false);
    // As if the student had picked the Library on the side rail, but never
    // closing it when it already shows.
    const s = useStore.getState();
    if (!(s.libraryOpen && s.inspectorPanel === 'library')) {
      s.toggleInspectorPanel('library');
    }
    focusLibrarySearch();
  };

  const category = step ? categoryOf(step) : null;

  return (
    <DawDialog
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title="Add a track"
      description="Pick what you want to play or record."
      initialFocus={first}
      data={{
        'data-testid': 'add-track-sheet',
        'data-step': step ?? 'categories',
      }}
    >
      <div ref={body} className="flex flex-col gap-3 pb-2">
        {category ? (
          <>
            <div className="flex flex-col items-start gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2.5"
                data-testid="add-track-back"
                data-tutorial-id="add-track-back"
                aria-label="Back to all tracks"
                onClick={back}
              >
                <ChevronLeft />
                All tracks
              </Button>
              <div>
                <h3
                  id={headingId}
                  className={cn(TYPE_CLASS.title, 'text-daw-text')}
                >
                  {category.label}
                </h3>
                <p className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                  {category.about}
                </p>
              </div>
            </div>
            {category.picker ? (
              <div data-tutorial-id="add-track-instrument-picker">
                <InstrumentPicker
                  title={null}
                  labelledBy={headingId}
                  families={pickerFamilies(null)}
                  onPick={addInstrument}
                />
              </div>
            ) : (
              <div className={GRID}>
                {category.choices.map((id) => {
                  const choice = choiceOf(id);
                  return (
                    <Tile
                      key={id}
                      anchor={choice.anchor}
                      pick={`choice:${id}`}
                      icon={CHOICE_ICON[id]}
                      label={choice.label}
                      about={choice.about}
                      onClick={() => add(choice)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={GRID}>
              {TRACK_CATEGORIES.map((c, i) => (
                <Tile
                  key={c.id}
                  tileRef={i === 0 ? first : undefined}
                  // A one-choice tile is its choice's anchor.
                  anchor={c.anchor ?? choiceOf(c.choices[0]).anchor}
                  pick={`category:${c.id}`}
                  icon={CATEGORY_ICON[c.id]}
                  label={c.label}
                  about={c.about}
                  onClick={() => openCategory(c)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip asChild size="md" icon={<FileUp />}>
                <button
                  type="button"
                  className={CHIP_BUTTON}
                  data-tutorial-id="add-track-import"
                  onClick={importMidi}
                >
                  Import MIDI file…
                </button>
              </Chip>
              <Chip asChild size="md" icon={<LibraryBig />}>
                <button
                  type="button"
                  className={CHIP_BUTTON}
                  data-tutorial-id="add-track-browser"
                  onClick={browse}
                >
                  Browse the library
                </button>
              </Chip>
            </div>
          </>
        )}
      </div>
    </DawDialog>
  );
}
