/**
 * SegmentedToggle.tsx — The pill switch over a Practice Track's keyboard: which
 * scale is lit, which voicing a chord is lit in. One option is always on.
 */

const ACCENT = '#7ecfcf';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** What the switch chooses, for a screen reader: 'Scale to show'. */
  label: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedToggleProps<T>) {
  return (
    <div
      className="flex items-center gap-1 rounded-full p-1"
      role="group"
      aria-label={label}
      style={{ border: '1px solid var(--color-border)' }}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
            style={{
              background: active ? ACCENT : 'transparent',
              color: active ? '#191919' : 'var(--color-text-dim)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
