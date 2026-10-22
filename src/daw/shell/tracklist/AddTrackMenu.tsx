import {
  AudioWaveform,
  Drum,
  Mic,
  Music2,
  Piano,
  Plus,
  Upload,
} from 'lucide-react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { hintText } from '@/daw/shell/help/hintSource';
import { Button } from '@/daw/ui/Button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { addTrackFrom, useAddTrackMenu } from './addTrack';
import { ADD_TRACK_SLOT_PX } from './rowLayout';
import {
  choiceOf,
  MIDI_MENU,
  type TrackChoice,
  type TrackChoiceId,
} from './trackTemplates';
import { pickAndUploadTrack } from './uploadTrack';

// ── + Add track (Suno layout) ──────────────────────────────────────────────
//
// Centred in the track column, as Suno's "+ Add new track": in a slot a
// track row high under the last track, or in the middle of an empty
// project's column (`fill`). Its menu has three rows, each with a key that
// picks it while the menu is open (no keycaps on the rows, owner 2026-10-21):
// - Add Audio (A): an Audio Track, open on its input and tuner;
// - Add MIDI (M): a submenu of the MIDI instruments (MIDI_MENU), since a
//   track keeps the instrument it was made with;
// - Upload (U): an audio file as a new Audio Track, or a MIDI file's tracks
//   (uploadTrack.ts).
// The menu's open state is shared (addTrack.ts), so the palette's Add a
// track… opens it here.

const MIDI_ICON: Partial<Record<TrackChoiceId, ReactNode>> = {
  synth: <AudioWaveform />,
  'drum-grid': <Drum />,
  instruments: <Music2 />,
};

/** The keys the menu takes while open, each picking its row. */
type RowKey = 'a' | 'm' | 'u';

export function AddTrackMenu({ fill = false }: { fill?: boolean }) {
  const open = useAddTrackMenu((s) => s.open);
  const setOpen = useAddTrackMenu((s) => s.setOpen);
  const [midiOpen, setMidiOpen] = useState(false);

  const add = (choice: TrackChoice) => {
    // At the track limit addTrack says so; the menu closes either way.
    addTrackFrom(choice);
  };

  const pick: Record<RowKey, () => void> = {
    a: () => {
      setOpen(false);
      add(choiceOf('audio'));
    },
    m: () => {
      setMidiOpen(true);
      // The submenu mounts on the next frame; its first instrument takes
      // focus, as ArrowRight would give it.
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            '[data-testid="add-track-midi-menu"] [role="menuitem"]',
          )
          ?.focus(),
      );
    },
    u: () => {
      setOpen(false);
      pickAndUploadTrack();
    },
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key !== 'a' && key !== 'm' && key !== 'u') return;
    // Inside the MIDI submenu, letters find an instrument (Radix typeahead).
    if (
      (e.target as HTMLElement).closest('[data-testid="add-track-midi-menu"]')
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    pick[key]();
  };

  return (
    <div
      data-ds="v2"
      data-testid="add-track-slot"
      className={cn(
        'flex shrink-0 items-center justify-center px-2',
        fill && 'flex-1',
      )}
      style={{ minHeight: ADD_TRACK_SLOT_PX }}
    >
      <Menu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setMidiOpen(false);
        }}
      >
        <MenuTrigger asChild>
          <Button
            size="sm"
            variant="quiet"
            data-tutorial-id="add-track-button"
            data-testid="add-track-button"
            data-hint={hintText(
              'Add track',
              'Add an audio or MIDI track, or upload a file',
            )}
          >
            <Plus aria-hidden />
            Add track
          </Button>
        </MenuTrigger>
        <MenuContent
          side="top"
          align="center"
          data-ds="v2"
          data-testid="add-track-menu"
          aria-label="Add a track"
          className="w-56"
          onKeyDown={onKeyDown}
        >
          <MenuItem
            icon={<Mic aria-hidden />}
            aria-keyshortcuts="A"
            data-tutorial-id="add-track-audio"
            data-item="add:audio"
            onSelect={() => add(choiceOf('audio'))}
          >
            Add Audio
          </MenuItem>
          <MenuSub open={midiOpen} onOpenChange={setMidiOpen}>
            <MenuSubTrigger
              icon={<Piano aria-hidden />}
              aria-keyshortcuts="M"
              data-tutorial-id="add-track-midi"
              data-item="add:midi"
            >
              Add MIDI
            </MenuSubTrigger>
            <MenuSubContent
              data-ds="v2"
              data-testid="add-track-midi-menu"
              aria-label="MIDI instruments"
              className="w-52"
            >
              {MIDI_MENU.map((id) => {
                const choice = choiceOf(id);
                return (
                  <MenuItem
                    key={id}
                    icon={MIDI_ICON[id]}
                    data-tutorial-id={`add-track-${choice.anchor}`}
                    data-item={`add:${id}`}
                    onSelect={() => add(choice)}
                  >
                    {choice.label}
                  </MenuItem>
                );
              })}
            </MenuSubContent>
          </MenuSub>
          <MenuItem
            icon={<Upload aria-hidden />}
            aria-keyshortcuts="U"
            data-tutorial-id="add-track-upload"
            data-item="add:upload"
            onSelect={pickAndUploadTrack}
          >
            Upload
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
