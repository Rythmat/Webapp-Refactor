import { useMemo, useState } from 'react';
import type { InteractionInputProps } from './types';

export const TextInput = ({
  interaction,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const maxLen = interaction.text?.maxLen ?? 500;

  const initial = useMemo(() => {
    if (submittedPayload?.kind === 'text') return submittedPayload.text;
    return '';
  }, [submittedPayload]);

  const [value, setValue] = useState<string>(initial);
  const trimmed = value.trim();
  const canSubmit = !disabled && trimmed.length > 0 && value.length <= maxLen;
  const remaining = maxLen - value.length;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLen))}
        disabled={disabled}
        rows={4}
        placeholder="Type your answer…"
        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            remaining < 20 ? 'text-amber-300' : 'text-white/50'
          }`}
        >
          {remaining} characters remaining
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => canSubmit && onSubmit({ kind: 'text', text: trimmed })}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};
