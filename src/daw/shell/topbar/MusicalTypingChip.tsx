import { Keyboard } from 'lucide-react';
import { memo } from 'react';
import { octaveLabel } from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import { useStore } from '@/daw/store';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The computer keyboard's switch (milestone 1.6) ─────────────────────────
//
// In sight whenever it is on, since then the letter keys play notes instead
// of being shortcuts: white/10 and the octave the A key plays ('Typing ·
// C4', or 'Typing · Drums' while the keys play a drum kit, A the kick);
// a click turns it off. ` toggles it, and the top bar's '⋯' has the
// switch; while it is off the chip is not shown (the bar was trimmed, 2.7).

const TOGGLE_KEYS = shortcutKeys('typing.on');

export const MusicalTypingChip = memo(function MusicalTypingChip() {
  const enabled = useMusicalTypingStore((s) => s.enabled);
  const octave = useMusicalTypingStore((s) => s.octave);
  const setEnabled = useMusicalTypingStore((s) => s.setEnabled);
  const drums = useStore((s) => liveTargetsAreDrums(s));
  if (!enabled) return null;
  return (
    <Tooltip
      content="Letter keys play notes. Z/X octave, C/V softer/louder"
      shortcut={TOGGLE_KEYS.label}
    >
      <Toggle
        label="Play notes from the computer keyboard"
        icon={<Keyboard />}
        pressed
        onPressedChange={setEnabled}
        aria-keyshortcuts={TOGGLE_KEYS.aria}
        data-testid="musical-typing-chip"
        className="shrink-0 rounded-full"
      >
        {`Typing · ${drums ? 'Drums' : octaveLabel(octave)}`}
      </Toggle>
    </Tooltip>
  );
});
