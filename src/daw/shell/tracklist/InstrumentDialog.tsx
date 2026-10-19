import { useId } from 'react';
import { setTrackInstrument } from '@/daw/commands/trackCommands';
import {
  hasInstrumentPicker,
  pickerFamilies,
  simpleInstrumentOf,
} from '@/daw/instruments/simpleInstruments';
import { useStore } from '@/daw/store';
import { DawDialog } from '@/daw/ui/DawDialog';
import { InstrumentPicker } from './InstrumentPicker';
import { useInstrumentDialogStore } from './instrumentDialogStore';

// ── Change a track's instrument ────────────────────────────────────────────
//
// The simple instrument picker in a dialog, for one track: a pick puts the
// instrument on the track (setTrackInstrument: one undo step that keeps the
// clips, the mix and the effects) and closes. A track's ⋯ menu (Instrument…)
// and the dock's instrument button open it. A drum track swaps kits; a
// melodic track offers the melodic families (pickerFamilies). DawApp mounts
// the host once; it renders only while the dialog is open on a MIDI track
// that is still in the project.

export function InstrumentDialogHost() {
  const trackId = useInstrumentDialogStore((s) => s.trackId);
  const close = useInstrumentDialogStore((s) => s.close);
  const track = useStore((s) =>
    trackId ? s.tracks.find((t) => t.id === trackId) : undefined,
  );
  const headingId = useId();
  if (!track || !hasInstrumentPicker(track)) return null;
  return (
    <DawDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="md"
      title={`${track.name}’s instrument`}
      description="Its notes, mix and effects stay as they are."
      data={{
        'data-testid': 'instrument-dialog',
        'data-tutorial-id': 'instrument-dialog',
      }}
    >
      <span id={headingId} className="sr-only">
        Instrument families
      </span>
      <InstrumentPicker
        title={null}
        labelledBy={headingId}
        families={pickerFamilies(track)}
        currentId={simpleInstrumentOf(track)?.id}
        onPick={(item) => {
          setTrackInstrument(track.id, item.id);
          close();
        }}
        className="pb-2"
      />
    </DawDialog>
  );
}
