import { useMemo, useState } from 'react';
import { pickLocalized } from '../../presentation/localized';
import type { InteractionInputProps } from './types';

export const ChoiceInput = ({
  interaction,
  language,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const multi = interaction.choice?.multi ?? false;
  const options = interaction.choice?.options ?? [];

  const initial = useMemo(() => {
    if (submittedPayload?.kind === 'choice') return submittedPayload.choices;
    return [] as number[];
  }, [submittedPayload]);

  const [selected, setSelected] = useState<number[]>(initial);

  const toggle = (idx: number) => {
    if (disabled) return;
    setSelected((prev) => {
      if (multi) {
        return prev.includes(idx)
          ? prev.filter((i) => i !== idx)
          : [...prev, idx];
      }
      return [idx];
    });
  };

  const canSubmit = !disabled && selected.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {options.map((option, idx) => {
          const isActive = selected.includes(idx);
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => toggle(idx)}
                disabled={disabled}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? 'border-white/40 bg-white/[0.08] text-white'
                    : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-white/25 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    multi ? 'rounded' : ''
                  } ${
                    isActive
                      ? 'border-white bg-white text-black'
                      : 'border-white/40'
                  }`}
                  aria-hidden="true"
                >
                  {isActive && (
                    <span className="text-[10px] font-bold">
                      {multi ? '✓' : '●'}
                    </span>
                  )}
                </span>
                <span>{pickLocalized(option, language)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">
          {multi ? 'Select one or more.' : 'Select the option that best fits.'}
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            canSubmit && onSubmit({ kind: 'choice', choices: selected })
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};
