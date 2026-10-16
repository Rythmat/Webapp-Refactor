import {
  AudioWaveform,
  Disc3,
  Drum,
  FileUp,
  Guitar,
  Mic,
  Music2,
  Piano,
  SlidersHorizontal,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { pickAndImportMidi } from '@/daw/midi/importMidiToTracks';
import { DawDialog } from '@/daw/ui/DawDialog';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { addTrackFrom, useAddTrackSheet } from './addTrack';
import {
  TRACK_TEMPLATES,
  type TrackKind,
  type TrackTemplate,
} from './trackTemplates';

// ── The Add-track sheet (milestone 2.6) ────────────────────────────────────
//
// '+ Add track' opens this dialog: every kind of track as a card with a line
// saying what it is for, in a grid that wraps, so nothing runs off a
// Chromebook's screen (timeline-27, fx-mixer-24). Focus starts on the first
// card and Escape closes it. Import MIDI file… opens the file picker and
// makes a Synth track per track of the file; it never makes an empty track.

const ICON: Record<TrackKind, ReactNode> = {
  keys: <Piano />,
  synth: <AudioWaveform />,
  organ: <SlidersHorizontal />,
  instruments: <Music2 />,
  drums: <Drum />,
  sampler: <Disc3 />,
  voice: <Mic />,
  guitar: <Guitar />,
  bass: <Guitar />,
};

const CARD = cn(
  'flex min-h-[72px] flex-col items-start gap-1 rounded-[var(--daw-radius-md)] border border-daw-hairline bg-daw-surface-2 p-3 text-left',
  'hover:border-daw-outline hover:bg-daw-hover',
  '[&_svg]:size-5 [&_svg]:text-daw-text-2',
  TRANSITION,
  FOCUS_RING,
);

function Card({
  icon,
  label,
  description,
  onClick,
  cardRef,
  ...data
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick(): void;
  cardRef?: React.Ref<HTMLButtonElement>;
  /** The lesson anchor. */
  'data-tutorial-id': string;
}) {
  return (
    <button
      ref={cardRef}
      type="button"
      className={CARD}
      onClick={onClick}
      {...data}
    >
      {icon}
      <span className={cn(TYPE_CLASS.body, 'font-bold text-daw-text')}>
        {label}
      </span>
      <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
        {description}
      </span>
    </button>
  );
}

export function AddTrackSheet() {
  const open = useAddTrackSheet((s) => s.open);
  const setOpen = useAddTrackSheet((s) => s.setOpen);
  const first = useRef<HTMLButtonElement>(null);

  const add = (template: TrackTemplate) => {
    // At the track limit addTrack says so, and the sheet stays open.
    if (addTrackFrom(template)) setOpen(false);
  };

  return (
    <DawDialog
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title="Add a track"
      description="Pick what you want to play or record."
      initialFocus={first}
      data={{ 'data-testid': 'add-track-sheet' }}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 pb-2">
        {TRACK_TEMPLATES.map((template, i) => (
          <Card
            key={template.kind}
            cardRef={i === 0 ? first : undefined}
            icon={ICON[template.kind]}
            label={template.label}
            description={template.description}
            // The Synth keeps 'add-track-synth', which lesson data names.
            data-tutorial-id={
              template.instrument === 'oracle-synth'
                ? 'add-track-synth'
                : `add-track-${template.instrument}`
            }
            onClick={() => add(template)}
          />
        ))}
        <Card
          icon={<FileUp />}
          label="Import MIDI file…"
          description="A Synth track for each track of a .mid file"
          data-tutorial-id="add-track-import"
          onClick={() => {
            setOpen(false);
            pickAndImportMidi();
          }}
        />
      </div>
    </DawDialog>
  );
}
