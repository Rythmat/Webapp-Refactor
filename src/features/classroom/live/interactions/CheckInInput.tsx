import { useState } from 'react';
import type { InteractionInputProps } from './types';

const EMOJI_OPTIONS = ['😀', '🙂', '😐', '😕', '😔', '🤔', '⚡', '💤'];
const SCALE_OPTIONS = ['1', '2', '3', '4', '5'];
const WORD_OPTIONS = [
  'Ready',
  'Curious',
  'Focused',
  'Tired',
  'Anxious',
  'Excited',
];

export const CheckInInput = ({
  interaction,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const style = interaction.checkIn?.style ?? 'emoji';
  const options =
    style === 'emoji'
      ? EMOJI_OPTIONS
      : style === 'scale'
        ? SCALE_OPTIONS
        : WORD_OPTIONS;

  const initial =
    submittedPayload?.kind === 'check-in' ? submittedPayload.value : null;
  const [selected, setSelected] = useState<string | null>(initial);

  const canSubmit = !disabled && selected !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-white/50">
          Teacher-only — your answer isn&apos;t shown to the class.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isActive = option === selected;
            return (
              <button
                key={option}
                type="button"
                onClick={() => !disabled && setSelected(option)}
                disabled={disabled}
                aria-pressed={isActive}
                className={`inline-flex items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  style === 'emoji'
                    ? 'h-12 w-12 text-2xl'
                    : 'px-4 py-2 text-sm text-white/85'
                } ${
                  isActive
                    ? 'border-white/60 bg-white/[0.12]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            canSubmit &&
            selected !== null &&
            onSubmit({ kind: 'check-in', value: selected })
          }
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};
