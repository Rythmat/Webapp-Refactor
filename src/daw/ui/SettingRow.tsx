// ── Setting row (milestone 2.11) ────────────────────────────────────────────
import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { TYPE_CLASS } from './styles';

/** The ids a row hands its control, so the control can name itself by them. */
export interface SettingRowIds {
  labelId: string;
  descriptionId: string;
}

export interface SettingRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What the setting is called ('Count-in'). */
  label: string;
  /**
   * One plain line on what it does, for a student ('Bars of clicks before
   * recording starts'). Required: every setting in the editor explains itself.
   */
  description: string;
  /**
   * The control. A function receives the label's and the description's ids:
   * pass them on as the control's `aria-labelledby` / `aria-describedby` so
   * a screen reader reads the line with it. Given plain, the row becomes a
   * group named by the label and described by the line.
   */
  children: ReactNode | ((ids: SettingRowIds) => ReactNode);
  /** Control at the right of the words (default) or under them. */
  layout?: 'inline' | 'stacked';
}

/**
 * One setting: its name, a one-line explanation under the name, and the
 * control. The pattern every settings surface in the editor uses (the Audio
 * & MIDI dialog, the '?' sheet's switches); menus use the `description` slot
 * on their items instead.
 */
export function SettingRow({
  label,
  description,
  children,
  layout = 'inline',
  className,
  ...props
}: SettingRowProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  // A control that takes the ids wires itself; any other (a Select, a
  // Segmented, a Fader) sits in a group named and described by the row, so
  // a screen reader reads the line on the way in.
  const wiresItself = typeof children === 'function';
  const control = wiresItself ? children({ labelId, descriptionId }) : children;
  const stacked = layout === 'stacked';
  return (
    <div
      data-setting-row
      role={wiresItself ? undefined : 'group'}
      aria-labelledby={wiresItself ? undefined : labelId}
      aria-describedby={wiresItself ? undefined : descriptionId}
      className={cn(
        'flex min-h-6 gap-x-3 gap-y-1.5',
        stacked ? 'flex-col items-stretch' : 'items-center justify-between',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className={cn(TYPE_CLASS.body, 'text-daw-text')}>
          {label}
        </span>
        <p
          data-setting-description
          id={descriptionId}
          className={cn(TYPE_CLASS.label, 'text-daw-text-3')}
        >
          {description}
        </p>
      </div>
      <div className={cn('flex items-center', !stacked && 'shrink-0')}>
        {control}
      </div>
    </div>
  );
}
