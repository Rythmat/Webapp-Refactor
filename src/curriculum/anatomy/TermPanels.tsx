import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { termCopy } from './anatomyCopy';
import { FAMILY_LABEL, type TermDef, type TermFamily } from './anatomyTypes';
import type { CompiledModel } from './compileModel';

// ── The words ──────────────────────────────────────────────────────────────
// Real buttons, grouped by family: the keyboard's and screen reader's way
// through the lesson, the drawing being the pointer's. And the card that says
// what the chosen word does.

const CARD = 'rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5';
const FAMILIES: readonly TermFamily[] = [
  'neck',
  'body',
  'hardware',
  'case',
  'keyboard',
  'engine',
  'controls',
  'action',
  'strings',
  'pedals',
  'electronics',
];

export function TermList({
  model,
  selected,
  onSelect,
  onHover,
}: {
  model: CompiledModel;
  selected: string | null;
  onSelect: (term: string) => void;
  onHover?: (term: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4" data-term-list>
      {FAMILIES.map((family) => {
        const terms = model.terms.filter((term) => term.family === family);
        if (!terms.length) return null;
        return (
          <section key={family} aria-label={FAMILY_LABEL[family]}>
            <h3 className="mb-2 text-[0.75rem] uppercase tracking-[0.08em] text-white/45">
              {FAMILY_LABEL[family]}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {terms.map((term) => {
                const on = term.id === selected;
                return (
                  <button
                    key={term.id}
                    type="button"
                    aria-pressed={on}
                    className={cn(
                      PROMPT_PILL,
                      on ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
                    )}
                    style={
                      on
                        ? { borderColor: model.accent, color: model.accent }
                        : undefined
                    }
                    onClick={() => onSelect(term.id)}
                    onPointerEnter={() => onHover?.(term.id)}
                    onPointerLeave={() => onHover?.(null)}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function TermDetail({
  model,
  term,
}: {
  model: CompiledModel;
  term: TermDef | null;
}) {
  if (!term) {
    return (
      <p
        className={cn(CARD, 'text-sm leading-5 text-white/55')}
        data-term-detail
      >
        Tap any part of the {model.noun}. It lifts out and the rest goes back
        together.
      </p>
    );
  }
  const copy = termCopy(model.kind, term.id);
  return (
    <div className={CARD} data-term-detail aria-live="polite">
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-white/45">
        {FAMILY_LABEL[term.family]}
      </p>
      <h3
        className="mt-1 text-xl font-semibold"
        style={{ color: model.accent }}
      >
        {term.name}
      </h3>
      {copy && (
        <>
          <p className="mt-3 text-sm leading-5 text-white/85">{copy.what}</p>
          <p className="mt-2 text-sm leading-5 text-white/55">{copy.why}</p>
        </>
      )}
    </div>
  );
}
