import { useEffect } from 'react';
import { TYPING_SCOPE } from '@/daw/commands/keymaps';
import {
  TYPING_VELOCITY_STEP,
  typingNote,
} from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { bindKeymap, type KeymapHandlers } from '@/daw/commands/registry';
import {
  captureLiveNoteOff,
  captureLiveNoteOn,
  playLiveNote,
  releaseLiveNote,
} from '@/daw/midi/liveNotes';

// ── useMusicalTyping (milestone 1.6) ───────────────────────────────────────
//
// The computer keyboard as a piano, for every instrument, while the student
// has it on (` or the chip in the top bar). It is the dispatcher's typing
// scope: above every view and region, below dialogs, so while it is on A is
// a C and not whatever A means where focus is, and the letter shortcuts
// (M, L, R, the Score's) rest. Text fields keep their keys.
//
// Notes take the shared live-notes path, as a MIDI keyboard's do: they sound
// on the monitored track (else the selected one), light the keys and
// Insight's Now Playing, reach collaborators and go into a MIDI take. A key
// lets go of the note it started even if the octave changed meanwhile, and
// every held note is let go when typing is turned off, the window loses
// focus or the editor closes, so no note is left hanging.
//
// DawApp calls it once. It never re-renders anything: the switch is read
// when a key is pressed.

/** Notes sounding now, by the key that started them. */
const held = new Map<string, number>();

function release(code: string, timestamp: number): boolean {
  const note = held.get(code);
  if (note === undefined) return false;
  held.delete(code);
  releaseLiveNote(note);
  captureLiveNoteOff(note, timestamp);
  return true;
}

function releaseAll(): void {
  const now = performance.now();
  for (const code of [...held.keys()]) release(code, now);
}

const handlers: { current: KeymapHandlers } = {
  current: {
    'typing.note': (e) => {
      if (held.has(e.code)) return;
      const { octave, velocity } = useMusicalTypingStore.getState();
      const note = typingNote(e.code, octave);
      if (note === null) return;
      // Another key may be holding the same note (after an octave change).
      for (const [code, playing] of held) {
        if (playing === note) release(code, e.timeStamp);
      }
      held.set(e.code, note);
      playLiveNote(note, velocity);
      captureLiveNoteOn(note, velocity, e.timeStamp);
    },
    'typing.octaveDown': () => {
      useMusicalTypingStore.getState().shiftOctave(-1);
    },
    'typing.octaveUp': () => {
      useMusicalTypingStore.getState().shiftOctave(1);
    },
    'typing.softer': () => {
      useMusicalTypingStore.getState().shiftVelocity(-TYPING_VELOCITY_STEP);
    },
    'typing.louder': () => {
      useMusicalTypingStore.getState().shiftVelocity(TYPING_VELOCITY_STEP);
    },
    'typing.off': () => {
      useMusicalTypingStore.getState().setEnabled(false);
    },
  },
};

export function useMusicalTyping(): void {
  useEffect(() => {
    const unbind = bindKeymap(TYPING_SCOPE.id, handlers, {
      isActive: () => useMusicalTypingStore.getState().enabled,
    });
    // A key let go anywhere (even after focus moved into a field) ends its
    // note. Only keys that started one are kept from the page.
    const onKeyUp = (e: KeyboardEvent) => {
      if (release(e.code, e.timeStamp)) e.preventDefault();
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    const offWhenDisabled = useMusicalTypingStore.subscribe((s, prev) => {
      if (prev.enabled && !s.enabled) releaseAll();
    });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      unbind();
      offWhenDisabled();
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onHidden);
      releaseAll();
    };
  }, []);
}
