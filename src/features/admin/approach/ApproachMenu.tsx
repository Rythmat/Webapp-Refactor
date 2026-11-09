import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import {
  APPROACH_PATTERNS,
  patternLabel,
  patternSteps,
  type ApproachMotion,
  type ApproachScale,
  type ApproachStep,
} from '@/curriculum/engine/approach/approach';
import { CONSOLE_LABEL, consoleTabClass } from '../ui/styles';
import type { ApproachChoice } from './approachEdit';

const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#60a5fa]';

/** The lengths an approach can be laid in, in quarters. */
export const APPROACH_LENGTHS = [
  { label: '16th', q: 0.25 },
  { label: '8th triplet', q: 1 / 3 },
  { label: '8th', q: 0.5 },
  { label: 'quarter triplet', q: 2 / 3 },
  { label: 'quarter', q: 1 },
];

interface MenuProps {
  /** What the editor lays: 'note', 'chord', 'hit'. */
  noun: string;
  /** Each approach's length to start with: a grid step. */
  defaultQ: number;
  onApply: (choice: ApproachChoice, lengthQ: number) => void;
}

/**
 * "Approach into this note": the sixteen patterns (A above, B below,
 * farthest first), chromatic or diatonic — to the key or the goal — and
 * how long each approach is. The same menu in the Bass Lines, Comping and
 * Parts editors.
 */
export const ApproachMenu: FC<MenuProps> = ({ noun, defaultQ, onApply }) => {
  const [motion, setMotion] = useState<ApproachMotion>('chromatic');
  const [scale, setScale] = useState<ApproachScale>('key');
  const [lengthQ, setLengthQ] = useState<number | null>(null);
  const each = lengthQ ?? defaultQ;
  return (
    <details className="w-full rounded-md border border-white/[0.08] px-3 py-2">
      <summary className="cursor-pointer text-sm text-white/80">
        Approach into this {noun}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <div
            role="radiogroup"
            aria-label="Chromatic or diatonic"
            className="flex gap-1.5"
          >
            {(['chromatic', 'diatonic'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={motion === m}
                onClick={() => setMotion(m)}
                className={consoleTabClass(motion === m, 'sm')}
              >
                {m === 'chromatic' ? 'Chromatic' : 'Diatonic'}
              </button>
            ))}
          </div>
          {motion === 'diatonic' && (
            <div
              role="radiogroup"
              aria-label="Diatonic to"
              className="flex gap-1.5"
            >
              {(['key', 'goal'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  role="radio"
                  aria-checked={scale === sc}
                  onClick={() => setScale(sc)}
                  className={consoleTabClass(scale === sc, 'sm')}
                  title={
                    sc === 'key'
                      ? "The key's scale: A minor's D natural into E7"
                      : "The goal chord's own scale: for a passage that has changed key"
                  }
                >
                  to the {sc}
                </button>
              ))}
            </div>
          )}
          <label className="flex items-center gap-1.5">
            Each
            <select
              value={each}
              onChange={(e) => setLengthQ(Number(e.target.value))}
              className={control}
              aria-label="Each approach's length"
            >
              {APPROACH_LENGTHS.map((l) => (
                <option key={l.label} value={l.q}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="grid grid-cols-4 gap-1.5 sm:grid-cols-8"
          aria-label="Approach patterns"
        >
          {APPROACH_PATTERNS.map((pattern) => (
            <Button
              key={pattern}
              size="sm"
              variant="outline"
              onClick={() => onApply({ pattern, motion, scale }, each)}
              title={`${patternSteps(pattern)
                .map((n) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`)
                .join(' ')} into this ${noun}`}
            >
              {patternLabel(pattern)}
            </Button>
          ))}
        </div>
        <p className="text-xs text-white/45">
          A above, B below, farthest first: 2A 1B is two above stepping in, then
          one below. They go in just before this {noun}, replacing what&rsquo;s
          there; laid before an approach, they chain into it.
        </p>
      </div>
    </details>
  );
};

interface FieldsProps {
  approach: ApproachStep;
  goal?: boolean;
  onChange: (patch: { approach?: ApproachStep; goal?: boolean }) => void;
  /** Stop it being an approach: 'By genre' for a bass line's, else 'Clear'. */
  clearLabel: string;
  clearHint: string;
  onClear: () => void;
}

/**
 * A selected approach: how many steps from its goal and from which side,
 * chromatic or diatonic (to the key or the goal), and whether it is a goal
 * itself (a chain).
 */
export const ApproachFields: FC<FieldsProps> = ({
  approach,
  goal,
  onChange,
  clearLabel,
  clearHint,
  onClear,
}) => {
  const patch = (p: Partial<ApproachStep>) =>
    onChange({ approach: { ...approach, ...p } });
  return (
    <div className="flex flex-col gap-1">
      <span className={CONSOLE_LABEL}>This approach</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <select
          value={approach.step}
          onChange={(e) => patch({ step: Number(e.target.value) })}
          className={control}
          aria-label="Steps from its goal"
        >
          {[4, 3, 2, 1, -1, -2, -3, -4].map((n) => (
            <option key={n} value={n}>
              {Math.abs(n)} {n > 0 ? 'above' : 'below'}
            </option>
          ))}
        </select>
        <select
          value={approach.motion}
          onChange={(e) => patch({ motion: e.target.value as ApproachMotion })}
          className={control}
          aria-label="Chromatic or diatonic"
        >
          <option value="chromatic">Chromatic</option>
          <option value="diatonic">Diatonic</option>
        </select>
        {approach.motion === 'diatonic' && (
          <select
            value={approach.scale ?? 'key'}
            onChange={(e) =>
              patch({ scale: e.target.value === 'goal' ? 'goal' : undefined })
            }
            className={control}
            aria-label="Diatonic to"
          >
            <option value="key">to the key</option>
            <option value="goal">to the goal</option>
          </select>
        )}
        <label className="flex items-center gap-1 text-xs text-white/70">
          <input
            type="checkbox"
            checked={Boolean(goal)}
            onChange={(e) => onChange({ goal: e.target.checked || undefined })}
          />
          Also a goal
        </label>
        <Button size="sm" variant="ghost" onClick={onClear} title={clearHint}>
          {clearLabel}
        </Button>
      </span>
    </div>
  );
};
