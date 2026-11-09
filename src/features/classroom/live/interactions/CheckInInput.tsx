import { useState } from 'react';
import { WHITE_PILL } from '@/components/kit';
import { cn } from '@/components/utilities';
import { FeelingsPicker } from '../../feelings/FeelingsPicker';
import type { InteractionInputProps } from './types';

// The older check-in tools, still answered by lessons saved with them.
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

const OlderOptions = ({
  style,
  selected,
  onSelect,
  disabled,
}: {
  style: 'emoji' | 'scale' | 'word';
  selected: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) => {
  const options =
    style === 'emoji'
      ? EMOJI_OPTIONS
      : style === 'scale'
        ? SCALE_OPTIONS
        : WORD_OPTIONS;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <button
            key={option}
            type="button"
            onClick={() => !disabled && onSelect(option)}
            disabled={disabled}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              style === 'emoji'
                ? 'size-12 text-2xl'
                : 'h-10 px-4 text-[0.875rem] text-daw-text',
              isActive
                ? 'border-white bg-white/[0.12]'
                : 'border-daw-outline hover:bg-daw-hover',
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

export const CheckInInput = ({
  interaction,
  language,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const style = interaction.checkIn?.style ?? 'emoji';
  const initial =
    submittedPayload?.kind === 'check-in' ? submittedPayload.value : null;
  const [selected, setSelected] = useState<string | null>(initial);
  const canSubmit = !disabled && selected !== null && selected !== initial;
  const es = language === 'es';

  return (
    <div className="flex flex-col gap-4">
      {style === 'feelings' ? (
        <FeelingsPicker
          level={interaction.checkIn?.level ?? 'simple'}
          value={selected}
          onChange={setSelected}
          disabled={disabled}
          language={language}
        />
      ) : (
        <OlderOptions
          style={style}
          selected={selected}
          onSelect={setSelected}
          disabled={disabled}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-daw-text-3">
          {es
            ? 'Solo tu maestro ve tu respuesta.'
            : 'Only your teacher sees this.'}
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            canSubmit &&
            selected !== null &&
            onSubmit({ kind: 'check-in', value: selected })
          }
          className={cn(
            WHITE_PILL,
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {initial && selected === initial
            ? es
              ? 'Enviado'
              : 'Sent'
            : es
              ? 'Enviar'
              : 'Send'}
        </button>
      </div>
    </div>
  );
};
