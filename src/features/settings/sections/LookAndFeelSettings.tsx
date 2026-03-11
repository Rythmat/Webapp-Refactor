/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '../useSettingsStore';

const HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--color-text)',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

const ToggleRow = ({ label, checked, onCheckedChange }: ToggleRowProps) => (
  <div
    className="flex items-center justify-between rounded-lg px-4 py-3"
    style={{
      background: 'rgba(255,255,255,0.03)',
      borderBottom: '1px solid var(--color-border)',
    }}
  >
    <span
      style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--color-text)',
      }}
    >
      {label}
    </span>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const LookAndFeelSettings = () => {
  const appSounds = useSettingsStore((s) => s.appSounds);
  const autoPreview = useSettingsStore((s) => s.autoPreview);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const noteStreaks = useSettingsStore((s) => s.noteStreaks);
  const setAppSounds = useSettingsStore((s) => s.setAppSounds);
  const setAutoPreview = useSettingsStore((s) => s.setAutoPreview);
  const setHighContrast = useSettingsStore((s) => s.setHighContrast);
  const setNoteStreaks = useSettingsStore((s) => s.setNoteStreaks);

  return (
    <>
      <h2 style={HEADING}>Look &amp; Feel</h2>
      <div className="glass-panel-sm" style={PANEL}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            label="APP SOUNDS"
            checked={appSounds}
            onCheckedChange={setAppSounds}
          />
          <ToggleRow
            label="AUTO PREVIEW"
            checked={autoPreview}
            onCheckedChange={setAutoPreview}
          />
          <ToggleRow
            label="HIGH CONTRAST MODE"
            checked={highContrast}
            onCheckedChange={setHighContrast}
          />
          <ToggleRow
            label="NOTE STREAKS"
            checked={noteStreaks}
            onCheckedChange={setNoteStreaks}
          />
        </div>
      </div>
    </>
  );
};
