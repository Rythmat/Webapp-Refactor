import { Palette, Pencil, Tag, Trash2, Unlock, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/components/utilities';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { useStore, type Track } from '@/daw/store';
import { undo, undoLabel, withTransaction } from '@/daw/store/history';
import {
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING } from '@/daw/ui/styles';
import type { DawTrackRole } from '@/daw/utils/trackRole';

// ── A track's ⋯ menu (milestone 2.6) ───────────────────────────────────────
//
// What the old header packed into its 200×80 px, one item each: rename,
// colour, the role chord analysis reads it as, monitoring, a test note, the
// automation lane, releasing it to collaborators (in a session), and
// delete, which can be undone from its toast. On a track a collaborator
// holds, everything that would change it is off.

const ROLES: readonly { value: DawTrackRole; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'chords', label: 'Chords' },
  { value: 'melody', label: 'Melody' },
  { value: 'bass', label: 'Bass' },
  { value: 'drums', label: 'Drums' },
];

/** The undo step a delete makes, which its toast's Undo takes back. */
export const DELETE_TRACK_LABEL = 'Delete track';

/** Plays a middle C on the track's instrument, if it has loaded. */
export function testSound(trackId: string): void {
  const instrument = trackEngineRegistry.get(trackId)?.trackEngine;
  if (!instrument || instrument.getInstrument() === null) return;
  instrument.noteOn(60, 100);
  setTimeout(() => instrument.noteOff(60), 300);
}

/** Deletes the track as one undo step, with Undo on its toast. */
export function deleteTrack(track: Pick<Track, 'id' | 'name'>): void {
  withTransaction(DELETE_TRACK_LABEL, () =>
    useStore.getState().removeTrack(track.id),
  );
  if (useStore.getState().tracks.some((t) => t.id === track.id)) return;
  toast(`Deleted ${track.name}`, {
    action: {
      label: 'Undo',
      onClick: () => {
        // Only while the delete is still the last thing done.
        if (undoLabel() === DELETE_TRACK_LABEL) undo();
      },
    },
  });
}

export interface TrackMenuContentProps {
  track: Track;
  /** A collaborator has selected the track: it is theirs for now. */
  locked: boolean;
  isSelected: boolean;
  onRename(): void;
  onCloseAutoFocus(event: Event): void;
}

export function TrackMenuContent({
  track,
  locked,
  isSelected,
  onRename,
  onCloseAutoFocus,
}: TrackMenuContentProps) {
  const automationOpen = useStore((s) => s.automationOpenTrackId === track.id);
  const collab = useStore((s) => s.isCollabActive);
  const s = () => useStore.getState();

  return (
    <MenuContent
      align="start"
      side="right"
      data-ds="v2"
      data-testid="track-menu"
      className="w-56"
      onClick={(e) => e.stopPropagation()}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <MenuItem icon={<Pencil />} disabled={locked} onSelect={onRename}>
        Rename
      </MenuItem>
      <MenuSub>
        <MenuSubTrigger icon={<Palette />} disabled={locked}>
          Colour
        </MenuSubTrigger>
        <MenuSubContent data-ds="v2" className="w-[188px] p-2">
          <div
            role="group"
            aria-label="Track colour"
            className="grid grid-cols-5 gap-1.5"
          >
            {TRACK_PALETTES.map((color, i) => (
              <MenuItem
                key={color}
                aria-label={`Colour ${i + 1}${color === track.color ? ' (now)' : ''}`}
                data-meaning="track-colour"
                className={cn(
                  'size-7 min-h-0 justify-center rounded-full p-0',
                  FOCUS_RING,
                )}
                onSelect={() => s().updateTrack(track.id, { color })}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mx-auto block size-5 rounded-full',
                    color === track.color &&
                      'ring-2 ring-daw-text ring-offset-1 ring-offset-daw-popover',
                  )}
                  style={{ backgroundColor: color }}
                />
              </MenuItem>
            ))}
          </div>
        </MenuSubContent>
      </MenuSub>
      <MenuSub>
        <MenuSubTrigger icon={<Tag />} disabled={locked}>
          Role for chord analysis
        </MenuSubTrigger>
        <MenuSubContent data-ds="v2">
          <MenuRadioGroup
            value={track.trackRole}
            onValueChange={(value) =>
              s().updateTrack(track.id, { trackRole: value as DawTrackRole })
            }
          >
            {ROLES.map((role) => (
              <MenuRadioItem key={role.value} value={role.value}>
                {role.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuSubContent>
      </MenuSub>
      <MenuSeparator />
      <MenuCheckboxItem
        checked={track.monitoring}
        disabled={locked}
        onCheckedChange={() => s().toggleMonitoring(track.id)}
      >
        Monitor input
      </MenuCheckboxItem>
      {track.type === 'midi' ? (
        <MenuItem icon={<Volume2 />} onSelect={() => testSound(track.id)}>
          Test sound
        </MenuItem>
      ) : null}
      <MenuCheckboxItem
        data-tutorial-id="automation-toggle"
        // The check sits where the other items' icons do.
        checked={automationOpen}
        onCheckedChange={(on) =>
          s().setAutomationOpenTrackId(on ? track.id : null)
        }
      >
        Show automation
      </MenuCheckboxItem>
      {collab && isSelected ? (
        <MenuItem
          icon={<Unlock />}
          onSelect={() => s().setSelectedTrackId(null)}
        >
          Release to others
        </MenuItem>
      ) : null}
      <MenuSeparator />
      <MenuItem
        icon={<Trash2 />}
        danger
        disabled={locked}
        onSelect={() => deleteTrack(track)}
      >
        Delete track
      </MenuItem>
    </MenuContent>
  );
}
