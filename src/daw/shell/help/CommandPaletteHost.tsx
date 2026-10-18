import { useEffect, useState } from 'react';
import { CommandPalettePart } from '@/daw/shell/lazyParts';
import { usePaletteStore } from './usePaletteStore';

// DawApp mounts this once. ⌘K (help.palette) and '⋯' ▸ Find a command open
// the palette; its code loads when it first opens (milestone 1.12a), and it
// then stays mounted, closed, so it can close in its own time and run the
// chosen command after focus is back (CommandPalette).

export function CommandPaletteHost() {
  const isOpen = usePaletteStore((s) => s.isOpen);
  const opener = usePaletteStore((s) => s.opener);
  const close = usePaletteStore((s) => s.close);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (isOpen) setLoaded(true);
  }, [isOpen]);
  if (!loaded && !isOpen) return null;
  return (
    <CommandPalettePart
      open={isOpen}
      opener={opener}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
