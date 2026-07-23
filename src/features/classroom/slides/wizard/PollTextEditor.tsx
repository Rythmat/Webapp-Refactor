import { Plus, X } from 'lucide-react';
import type { LocalizedText } from '../../types';
import type { SongSessionParams } from '../templates/songSession';

interface PollTextEditorProps {
  params: SongSessionParams;
  onChange: (params: SongSessionParams) => void;
  /** 'genre' hides the song-only listening prompt. */
  variant?: 'song' | 'genre';
}

/**
 * Step 3 of the deck wizard — the ONLY editable knobs of the template:
 * bilingual question texts, the question type, and its choice options.
 * Deliberately not a slide editor; everything else is template-fixed.
 */
export const PollTextEditor = ({
  params,
  onChange,
  variant = 'song',
}: PollTextEditorProps) => {
  const patch = (p: Partial<SongSessionParams>) =>
    onChange({ ...params, ...p });

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Emotional check-in"
        hint="Teacher-only responses — never shown to the class."
        value={params.checkInQuestion}
        onChange={(checkInQuestion) => patch({ checkInQuestion })}
      />
      {variant === 'song' && (
        <Field
          label="Listening prompt"
          hint="Shown with the video and asked on student devices."
          value={params.mediaPrompt}
          onChange={(mediaPrompt) => patch({ mediaPrompt })}
        />
      )}

      {variant === 'song' && (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Toggle
            label="Theory practice slide"
            hint="Students open the real Theory lesson from a slide."
            checked={params.includeAppRoute}
            onChange={(includeAppRoute) => patch({ includeAppRoute })}
          />
          <Toggle
            label="Studio pairing + showcase"
            hint="Students pair up in the Studio, then offer projects to feature."
            checked={params.includeStudioShare}
            onChange={(includeStudioShare) => patch({ includeStudioShare })}
          />
          <label className="flex items-center justify-between gap-3 px-1 py-1.5">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-white/85">
                Slide timer
              </span>
              <span className="text-xs text-white/45">
                Pre-fill the timer on media + question slides (0 = off).
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={5}
                value={params.slideTimerSec ?? 0}
                onChange={(e) =>
                  patch({ slideTimerSec: Math.max(0, Number(e.target.value)) })
                }
                className="w-16 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-xs text-white/45">sec</span>
            </span>
          </label>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/85">
            Response type
          </span>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-xs">
            {(['choice', 'text'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={params.question.type === t}
                onClick={() =>
                  patch({ question: { ...params.question, type: t } })
                }
                className={
                  'rounded-full px-3 py-1 transition-colors ' +
                  (params.question.type === t
                    ? 'bg-white text-black'
                    : 'text-white/60 hover:text-white')
                }
              >
                {t === 'choice' ? 'Multiple choice' : 'Short answer'}
              </button>
            ))}
          </div>
        </div>

        {params.question.type === 'choice' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-white/40">
              Options
            </span>
            {(params.question.options ?? []).map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={option.en}
                  onChange={(e) => {
                    const options = [...(params.question.options ?? [])];
                    options[i] = { ...options[i], en: e.target.value };
                    patch({ question: { ...params.question, options } });
                  }}
                  className={INPUT_CLASS}
                  placeholder={`Option ${i + 1}`}
                />
                <input
                  value={option.es ?? ''}
                  onChange={(e) => {
                    const options = [...(params.question.options ?? [])];
                    options[i] = {
                      ...options[i],
                      es: e.target.value || undefined,
                    };
                    patch({ question: { ...params.question, options } });
                  }}
                  className={INPUT_CLASS}
                  placeholder="Español (optional)"
                />
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => {
                    const options = (params.question.options ?? []).filter(
                      (_, j) => j !== i,
                    );
                    patch({ question: { ...params.question, options } });
                  }}
                  className="shrink-0 rounded-full p-1 text-white/35 hover:bg-white/10 hover:text-white/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch({
                  question: {
                    ...params.question,
                    options: [...(params.question.options ?? []), { en: '' }],
                  },
                })
              }
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/25 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          </div>
        )}
      </div>

      <Field
        label="Exit reflection"
        hint="Asked at the end of class; can be revealed as a class wall."
        value={params.exitLearned}
        onChange={(exitLearned) => patch({ exitLearned })}
      />
    </div>
  );
};

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left"
  >
    <span className="flex flex-col">
      <span className="text-sm font-medium text-white/85">{label}</span>
      {hint && <span className="text-xs text-white/45">{hint}</span>}
    </span>
    <span
      className={
        'relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ' +
        (checked ? 'bg-[#7ecfcf]' : 'bg-white/15')
      }
    >
      <span
        className={
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        }
      />
    </span>
  </button>
);

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30';

const Field = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
}) => (
  <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-white/85">{label}</span>
      {hint && <span className="text-xs text-white/45">{hint}</span>}
    </div>
    <input
      value={value.en}
      onChange={(e) => onChange({ ...value, en: e.target.value })}
      className={INPUT_CLASS}
      placeholder="English"
    />
    <input
      value={value.es ?? ''}
      onChange={(e) => onChange({ ...value, es: e.target.value || undefined })}
      className={INPUT_CLASS}
      placeholder="Español (optional)"
    />
  </div>
);
