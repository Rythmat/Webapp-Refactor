import { type ComponentPropsWithoutRef } from 'react';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import { TYPE_CLASS } from './styles';

export type ReadoutTone = 'default' | 'muted' | 'record' | 'warning';

export interface ReadoutProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** The text to show, already formatted ('−6.0 dB', '120', '1.2.3'). */
  value: string;
  size?: 'label' | 'body' | 'title';
  tone?: ReadoutTone;
}

const TONE: Record<ReadoutTone, string> = {
  default: 'text-daw-text',
  muted: 'text-daw-text-3',
  record: 'text-daw-danger-text',
  warning: 'text-daw-warning',
};

/**
 * A number that changes in place: a level, a tempo, a position. Glacial's
 * digits are proportional, so each sits in a fixed cell (FixedDigits) and
 * the readout keeps its width as the value moves.
 *
 * It renders from its `value` prop. Frame-rate values (the playhead, meters)
 * must not come through React; they write to the DOM from their own source
 * (see Meter).
 */
export function Readout({
  value,
  size = 'label',
  tone = 'default',
  className,
  ...span
}: ReadoutProps) {
  return (
    <FixedDigits
      text={value}
      className={cn(
        'inline-block whitespace-nowrap',
        TYPE_CLASS[size],
        TONE[tone],
        className,
      )}
      {...span}
    />
  );
}
