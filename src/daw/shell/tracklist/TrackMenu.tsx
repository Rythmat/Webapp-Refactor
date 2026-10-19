import {
  Copy,
  Download,
  Palette,
  Tag,
  Trash2,
  Unlock,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { shortcutKeys } from '@/daw/commands/shortcuts';
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
import { openExport } from '@/daw/shell/export/exportDialogStore';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import { duplicateTrack } from './duplicateTrack';
import { focusTrackRow } from './useTrackListKeys';
import { renameTrack } from './useTrackRename';

// ── A track's ⋯ menu (milestones 2.6 and 2.15) ─────────────────────────────
//
// What the old header packed into its 200×80 px, one item each: the name
// (a field at the top to type over, Mozart AI's pattern, 2.15), colour, the
// role chord analysis reads it as, Duplicate (2.15), monitoring, a test
// note, the automation lane, Export track ▸ (2.15), releasing it to
// collaborators (in a session), and delete, which can be undone from its
// toast. The ⋯ button and a right-click on the row open it (TrackRow). On a
// track a collaborator holds, everything that would change it is off;
// Duplicate and Export, which leave it as it is, stay on.

const DUPLICATE_KEYS = shortcutKeys('tracks.duplicate');

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

/**
 * The name, as a field at the top of the menu: Enter or leaving it renames
 * (one undo step), Escape puts the name back and closes the menu. Its keys
 * are its own: typing never jumps the menu to an item, and ↓ goes on to the
 * first item.
 */
function NameField({ track, locked }: { track: Track; locked: boolean }) {
  // Escape: Radix closes the menu on the document before the field sees
  // the key, and the field blurs on the way out, so the menu's
  // onEscapeKeyDown marks the field (data-cancelled) first.
  const cancelled = useRef(false);
  const wasCancelled = (field: HTMLInputElement | null) =>
    cancelled.current || field?.dataset.cancelled === 'true';
  // Only a name the student typed is written (not one a partner changed
  // while the menu was open).
  const typed = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  // A click outside closes the menu without the field ever losing focus
  // first: what was typed is kept as it goes.
  const trackId = track.id;
  // The menu opens with the name selected here, ready to type over: typed
  // letters rename rather than jump to an item (Radix's typeahead ran
  // "Duplicate track" on a D and Return). This runs before the menu's own
  // focus, which then leaves focus where it is. Off on a held track, where
  // the first item takes focus as usual.
  useEffect(() => {
    if (locked) return;
    input.current?.focus();
    input.current?.select();
    // Only as the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const field = input.current;
    return () => {
      if (typed.current && !wasCancelled(field) && field) {
        renameTrack(trackId, field.value);
      }
    };
  }, [trackId]);
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // The menu closes on it; the name stays as it was.
      cancelled.current = true;
      e.currentTarget.value = track.name;
      return;
    }
    if (e.key === 'Tab') return;
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      renameTrack(track.id, e.currentTarget.value);
      typed.current = false;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.currentTarget
        .closest('[role="menu"]')
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([data-disabled])')
        ?.focus();
    }
  };
  return (
    <div className="px-1 pb-1 pt-0.5">
      <input
        ref={input}
        data-testid="track-menu-name"
        aria-label={`Name of ${track.name}`}
        defaultValue={track.name}
        disabled={locked}
        spellCheck={false}
        className={cn(
          'h-7 w-full rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-bg px-2 font-bold text-daw-text outline-none focus:border-daw-text-3 disabled:opacity-40',
          TYPE_CLASS.body,
        )}
        onKeyDown={onKeyDown}
        onChange={() => {
          typed.current = true;
        }}
        onBlur={(e) => {
          if (typed.current && !wasCancelled(e.currentTarget)) {
            renameTrack(track.id, e.currentTarget.value);
            typed.current = false;
          }
        }}
      />
    </div>
  );
}

/** Whether a track holds anything an audio export would play. */
function playsSomething(track: Track): boolean {
  return (
    track.midiClips.some((c) => !c.muted && c.events.length > 0) ||
    track.audioClips.some((c) => !c.muted)
  );
}

/** Duplicates the track and moves focus to the copy's row. */
function duplicateFromMenu(trackId: string): void {
  const copy = duplicateTrack(trackId);
  if (copy) focusTrackRow(copy);
}

export interface TrackMenuContentProps {
  track: Track;
  /** A collaborator has selected the track: it is theirs for now. */
  locked: boolean;
  isSelected: boolean;
  /** Where the menu opens (the ⋯ button's side, or at the pointer). */
  side?: 'right' | 'bottom';
  /** Where focus goes as it closes (Radix: back to its trigger). */
  onCloseAutoFocus?(event: Event): void;
}

export function TrackMenuContent({
  track,
  locked,
  isSelected,
  side = 'right',
  onCloseAutoFocus,
}: TrackMenuContentProps) {
  const automationOpen = useStore((s) => s.automationOpenTrackId === track.id);
  const collab = useStore((s) => s.isCollabActive);
  const s = () => useStore.getState();
  const hasNotes = track.midiClips.some((c) => !c.muted && c.events.length > 0);
  const plays = playsSomething(track);

  return (
    <MenuContent
      align="start"
      side={side}
      data-ds="v2"
      data-testid="track-menu"
      aria-label={`${track.name} menu`}
      className="w-60"
      onClick={(e) => e.stopPropagation()}
      onCloseAutoFocus={onCloseAutoFocus}
      onKeyDown={(e) => {
        // ↑ from the first item goes back up to the name.
        if (e.key !== 'ArrowUp' || locked) return;
        const menu = e.currentTarget;
        const first = menu.querySelector(
          '[role="menuitem"]:not([data-disabled])',
        );
        if (e.target !== first) return;
        e.preventDefault();
        menu
          .querySelector<HTMLInputElement>('[data-testid="track-menu-name"]')
          ?.focus();
      }}
      onEscapeKeyDown={(e) => {
        // Escape in the name field: the name stays as it was (NameField).
        const field = e.target;
        if (
          field instanceof HTMLInputElement &&
          field.dataset.testid === 'track-menu-name'
        ) {
          field.dataset.cancelled = 'true';
        }
      }}
    >
      <NameField track={track} locked={locked} />
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
      <MenuItem
        icon={<Copy />}
        data-testid="track-menu-duplicate"
        shortcut={DUPLICATE_KEYS.label}
        onSelect={() => duplicateFromMenu(track.id)}
      >
        Duplicate track
      </MenuItem>
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
      <MenuSub>
        <MenuSubTrigger
          icon={<Download />}
          data-testid="track-menu-export"
          disabled={!plays}
        >
          Export track
        </MenuSubTrigger>
        <MenuSubContent data-ds="v2" className="w-60">
          <MenuItem
            data-testid="track-menu-export-wav"
            onSelect={() =>
              openExport({ tab: 'audio', trackId: track.id, format: 'wav' })
            }
          >
            WAV audio file
          </MenuItem>
          <MenuItem
            data-testid="track-menu-export-wav-dry"
            onSelect={() =>
              openExport({
                tab: 'audio',
                trackId: track.id,
                format: 'wav',
                dry: true,
              })
            }
          >
            WAV audio file (no effects)
          </MenuItem>
          <MenuItem
            data-testid="track-menu-export-midi"
            disabled={!hasNotes}
            onSelect={() =>
              openExport({
                tab: 'notation',
                trackId: track.id,
                notation: 'midi',
              })
            }
          >
            MIDI file
          </MenuItem>
          <MenuItem
            data-testid="track-menu-export-musicxml"
            disabled={!hasNotes}
            onSelect={() =>
              openExport({
                tab: 'notation',
                trackId: track.id,
                notation: 'score',
              })
            }
          >
            Music notation (MusicXML)
          </MenuItem>
        </MenuSubContent>
      </MenuSub>
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
