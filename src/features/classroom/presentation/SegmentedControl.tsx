/**
 * SegmentedControl — the pill-group toggle used by Presentation Mode's chrome
 * (language / age) and reused by the slide editor's top bar so both surfaces
 * offer the same controls.
 */
interface SegmentedControlProps<V extends string> {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}

export const SegmentedControl = <V extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<V>) => {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            opt.value === value
              ? 'bg-white text-black'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
