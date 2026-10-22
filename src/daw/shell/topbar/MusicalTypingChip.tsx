import { Keyboard, X } from 'lucide-react';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { octaveLabel } from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The computer keyboard's chip (milestones 1.6 and 2.11) ─────────────────
//
// In sight whenever it is on, since then the letter keys play notes instead
// of being shortcuts: a white/10 pill with the octave the A key plays and
// the velocity ('Typing · C4 · vel 100', or 'Typing · Drums · vel 100'
// while the keys play a drum kit, A the kick), and an × that turns it off
// (a click on the words does too). ` toggles it, and the top bar's '⋯' has
// the switch; while it is off the chip is not shown (the bar was trimmed,
// 2.7). It never folds: the top bar measures it like any other control.
//
// A polite live region, mounted on or off, says what changed: on, off, the
// octave (Z/X) and the velocity (C/V), since none of it is otherwise heard
// by a screen reader until the next note. On drums the octave isn't said:
// the keys play the kit whatever the octave.
//
// Turned off while the keyboard focus is in it (its ×, the words, or ` on
// either), focus goes to the top bar's '⋯', where the switch is, rather
// than falling to the page.

const TOGGLE_KEYS = shortcutKeys('typing.on');

export const TYPING_ON_MESSAGE = 'Computer keyboard on: letters play notes';
export const TYPING_OFF_MESSAGE = 'Computer keyboard off';

/** The chip's name starts with its visible word (WCAG 2.5.3). */
export const TYPING_CHIP_LABEL =
  'Typing: play notes from the computer keyboard';

/** The '⋯' button focus goes to when the chip goes from under it. */
const FOCUS_AFTER_OFF = '[data-testid="top-bar-overflow"]';

/** What the live region says for a change from `before` to `now`. */
export function typingAnnouncement(
  before: { enabled: boolean; octave: number; velocity: number },
  now: { enabled: boolean; octave: number; velocity: number },
  drums = false,
): string | null {
  if (now.enabled !== before.enabled) {
    return now.enabled ? TYPING_ON_MESSAGE : TYPING_OFF_MESSAGE;
  }
  if (!now.enabled) return null;
  if (now.octave !== before.octave) {
    return drums ? null : `Octave ${octaveLabel(now.octave)}`;
  }
  if (now.velocity !== before.velocity) return `Velocity ${now.velocity}`;
  return null;
}

/** The chip's words: 'Typing · C4 · vel 100'. */
export function typingChipText(
  drums: boolean,
  octave: number,
  velocity: number,
): string {
  return `Typing · ${drums ? 'Drums' : octaveLabel(octave)} · vel ${velocity}`;
}

export const MusicalTypingChip = memo(function MusicalTypingChip() {
  const enabled = useMusicalTypingStore((s) => s.enabled);
  const octave = useMusicalTypingStore((s) => s.octave);
  const velocity = useMusicalTypingStore((s) => s.velocity);
  const setEnabled = useMusicalTypingStore((s) => s.setEnabled);
  const drums = useStore((s) => liveTargetsAreDrums(s));

  const [message, setMessage] = useState('');
  const before = useRef({ enabled, octave, velocity });
  useEffect(() => {
    const now = { enabled, octave, velocity };
    const said = typingAnnouncement(before.current, now, drums);
    before.current = now;
    if (said) setMessage(said);
    // A change of track alone says nothing (nothing above changed).
  }, [enabled, octave, velocity, drums]);

  return (
    <>
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="musical-typing-live"
      >
        {message}
      </span>
      {enabled && (
        <TypingPill
          text={typingChipText(drums, octave, velocity)}
          onOff={() => setEnabled(false)}
        />
      )}
    </>
  );
});

/** The pill itself, mounted only while the computer keyboard is on. */
function TypingPill({ text, onOff }: { text: string; onOff: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // As it unmounts, while its nodes are still in the page: if the focus is
  // in it, hand it to '⋯' rather than let it fall to <body>.
  useLayoutEffect(() => {
    const pill = ref.current;
    return () => {
      if (!pill?.contains(document.activeElement)) return;
      document
        .querySelector<HTMLElement>(FOCUS_AFTER_OFF)
        ?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Computer keyboard"
      data-testid="musical-typing-pill"
      className="flex h-7 shrink-0 items-center rounded-full bg-daw-selected"
    >
      <Tooltip
        content="Letter keys play notes. Z/X octave, C/V softer/louder"
        shortcut={TOGGLE_KEYS.label}
      >
        <Toggle
          label={TYPING_CHIP_LABEL}
          icon={<Keyboard />}
          pressed
          onPressedChange={(on) => {
            if (!on) onOff();
          }}
          aria-keyshortcuts={TOGGLE_KEYS.aria}
          data-testid="musical-typing-chip"
          data-tutorial-id="musical-typing"
          className="shrink-0 whitespace-nowrap rounded-full pr-1 data-[state=on]:bg-transparent data-[state=on]:hover:bg-daw-hover"
        >
          {text}
        </Toggle>
      </Tooltip>
      <IconButton
        label="Turn off the computer keyboard"
        icon={<X />}
        size="sm"
        tooltipSide="bottom"
        onClick={onOff}
        data-testid="musical-typing-off"
        className="mr-0.5 rounded-full"
      />
    </div>
  );
}
