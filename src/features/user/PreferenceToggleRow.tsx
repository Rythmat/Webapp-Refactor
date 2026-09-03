import { Switch } from '@/components/ui/switch';

type PreferenceToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * One labelled on/off row inside the user-page Preferences card. Shared by every
 * preference on that card so the rows stay visually identical.
 */
export const PreferenceToggleRow = ({
  label,
  description,
  checked,
  onCheckedChange,
}: PreferenceToggleRowProps) => (
  <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
    <div className="flex min-w-0 flex-col">
      <span className="text-sm text-white">{label}</span>
      <span className="text-xs text-white/50">{description}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs font-medium text-white/60">
        {checked ? 'On' : 'Off'}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-white"
      />
    </div>
  </div>
);
