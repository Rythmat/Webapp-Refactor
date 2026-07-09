import { useMemo, useState } from 'react';
import type { InteractionInputProps } from './types';

export const NumberInput = ({
  interaction,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const { min, max } = interaction.number ?? {};

  const initial = useMemo(() => {
    if (submittedPayload?.kind === 'number')
      return String(submittedPayload.value);
    return '';
  }, [submittedPayload]);

  const [raw, setRaw] = useState<string>(initial);
  const parsed = raw === '' ? null : Number(raw);
  const isValid =
    parsed !== null &&
    !Number.isNaN(parsed) &&
    (min === undefined || parsed >= min) &&
    (max === undefined || parsed <= max);

  const canSubmit = !disabled && isValid;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={disabled}
          min={min}
          max={max}
          placeholder="Type a number…"
          className="w-40 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-lg text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {(min !== undefined || max !== undefined) && (
          <span className="text-xs text-white/50">
            {min !== undefined && max !== undefined
              ? `Between ${min} and ${max}`
              : min !== undefined
                ? `At least ${min}`
                : `At most ${max}`}
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            canSubmit && onSubmit({ kind: 'number', value: parsed! })
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};
