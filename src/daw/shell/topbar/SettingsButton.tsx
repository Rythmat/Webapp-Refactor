import { Settings2 } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';

/** Audio & MIDI settings, the editor's one Settings dialog (2.3). */
export const SettingsButton = memo(function SettingsButton() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  return (
    <IconButton
      label="Audio & MIDI settings"
      icon={<Settings2 />}
      tooltipSide="bottom"
      data-testid="settings-button"
      onClick={() => setSettingsOpen(true)}
    />
  );
});
