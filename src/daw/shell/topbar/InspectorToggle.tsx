import { PanelRight } from 'lucide-react';
import { memo } from 'react';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useStore } from '@/daw/store';
import { Toggle } from '@/daw/ui/Toggle';

const INSPECTOR_KEYS = shortcutKeys('view.inspector');

/**
 * Opens and closes the Inspector (Insight and the Library until 2.8), and
 * remembers the choice for the view showing (milestone 2.4).
 */
export const InspectorToggle = memo(function InspectorToggle() {
  const open = useStore((s) => s.libraryOpen);
  const toggle = useStore((s) => s.toggleLibrary);
  return (
    <Toggle
      label="Inspector"
      icon={<PanelRight />}
      pressed={open}
      onPressedChange={() => toggle()}
      shortcut={INSPECTOR_KEYS.label}
      aria-keyshortcuts={INSPECTOR_KEYS.aria}
      data-testid="inspector-toggle"
    />
  );
});
