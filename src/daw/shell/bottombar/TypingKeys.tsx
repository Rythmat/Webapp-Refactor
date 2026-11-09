import { memo, useEffect, useRef, useState } from 'react';
import { octaveLabel } from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { TypingKeysGlyph } from '@/daw/ui/icons/frameIcons';
import { PILL_TOGGLE, PillGroup } from '@/daw/ui/Pill';
import { Toggle } from '@/daw/ui/Toggle';

// ── Typing keys (the bottom rail, 2026-10-21) ──────────────────────────────
//
// The computer keyboard's switch: with it on, the letter keys play notes on
// the selected track (or its kit) instead of being shortcuts. An icon
// toggle in its own pill on the bottom rail, under every view; it replaced
// the top bar's 'Typing · C4 · vel 100' chip and the drum kit's Keys
// switch (owner). ` toggles it too, and the top bar's '⋯' keeps its switch.
// The octave the A key plays and the velocity are on its hint line while it
// is on.
//
// A polite live region, mounted on or off, says what changed: on, off, the
// octave (Z/X) and the velocity (C/V), since none of it is otherwise heard
// by a screen reader until the next note. On drums the octave isn't said:
// the keys play the kit whatever the octave.

const TOGGLE_KEYS = shortcutKeys('typing.on');

export const TYPING_KEYS_LABEL = 'Typing keys';
export const TYPING_ON_MESSAGE = 'Computer keyboard on: letters play notes';
export const TYPING_OFF_MESSAGE = 'Computer keyboard off';

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

/** The hint line's words for the switch, on or off. */
export function typingKeysHint(
  enabled: boolean,
  drums: boolean,
  octave: number,
  velocity: number,
): string {
  if (!enabled) {
    return hintText(
      TYPING_KEYS_LABEL,
      'Play notes from the computer keyboard',
      TOGGLE_KEYS.label,
    );
  }
  return hintText(
    TYPING_KEYS_LABEL,
    drums ? 'Letters play the kit' : `A plays ${octaveLabel(octave)}`,
    `velocity ${velocity}`,
    drums ? 'C/V softer/louder' : 'Z/X octave, C/V softer/louder',
  );
}

export const TypingKeys = memo(function TypingKeys() {
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
    <PillGroup label={TYPING_KEYS_LABEL} data-testid="typing-keys">
      <Toggle
        label={TYPING_KEYS_LABEL}
        size="lg"
        tooltipSide="top"
        className={PILL_TOGGLE}
        icon={<TypingKeysGlyph />}
        pressed={enabled}
        onPressedChange={setEnabled}
        shortcut={TOGGLE_KEYS.label}
        aria-keyshortcuts={TOGGLE_KEYS.aria}
        data-testid="typing-keys-toggle"
        data-hint={typingKeysHint(enabled, drums, octave, velocity)}
      />
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="musical-typing-live"
      >
        {message}
      </span>
    </PillGroup>
  );
});
