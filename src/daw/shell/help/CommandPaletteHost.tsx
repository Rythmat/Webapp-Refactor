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
  // Its code loads while the editor is idle, so the first ⌘K opens it at
  // once: until it has focus, the keys typed into it would reach the
  // editor's shortcuts (a Chromebook takes a moment to load it).
  useEffect(() => {
    const load = () => void CommandPalettePart.preload();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(load, 2000);
    return () => window.clearTimeout(timer);
  }, []);
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
