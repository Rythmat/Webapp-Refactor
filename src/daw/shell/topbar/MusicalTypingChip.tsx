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
// key plays ('Typing · C4') when on. ` toggles it too. It sits in the
// editor's top bar since 2.5 (2.11 restyles it there).

const TOGGLE_KEYS = shortcutKeys('typing.on');

export const MusicalTypingChip = memo(function MusicalTypingChip({
  compact = false,
}: {
  /** The folded top bar's form: the icon alone while it is off (2.5). */
  compact?: boolean;
}) {
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
        data-tutorial-id="musical-typing"
        className="shrink-0 rounded-full"
      >
        {enabled
          ? `Typing · ${octaveLabel(octave)}`
          : compact
            ? null
            : 'Typing'}
      </Toggle>
    </Tooltip>
  );
});
