import { Keyboard } from 'lucide-react';
import { memo } from 'react';
import { octaveLabel } from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The computer keyboard's switch (milestone 1.6) ─────────────────────────
//
// Always in sight while the editor is open, since while it is on the letter
// keys play notes instead of being shortcuts: white/10 and the octave the A
// key plays ('Typing · C4') when on. ` toggles it too. Milestone 2.11 moves
// it into the editor's own top bar.

const TOGGLE_KEYS = shortcutKeys('typing.on');

export const MusicalTypingChip = memo(function MusicalTypingChip() {
  const enabled = useMusicalTypingStore((s) => s.enabled);
  const octave = useMusicalTypingStore((s) => s.octave);
  const setEnabled = useMusicalTypingStore((s) => s.setEnabled);
  return (
    <Tooltip
      content={
        enabled
          ? 'Letter keys play notes. Z/X octave, C/V softer/louder'
          : 'Play notes from the computer keyboard'
      }
      shortcut={TOGGLE_KEYS.label}
    >
      <Toggle
        label="Play notes from the computer keyboard"
        icon={<Keyboard />}
        pressed={enabled}
        onPressedChange={setEnabled}
        aria-keyshortcuts={TOGGLE_KEYS.aria}
        data-testid="musical-typing-chip"
        className="shrink-0 rounded-full"
      >
        {enabled ? `Typing · ${octaveLabel(octave)}` : 'Typing'}
      </Toggle>
    </Tooltip>
  );
});
