import { useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DiceButton,
  GoButton,
  PROMPT_FRAME,
  PROMPT_TEXTAREA,
  PROMPT_WASH,
  ROTATE_MS,
  RotatingSuggestion,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { useAssistantMatcher } from '../dashboard/assistant/useAssistantMatcher';
import { areaOf, resolvePromptRoute } from './promptRouting';
import {
  PROMPT_TARGETS,
  rotationFor,
  type PromptSuggestion,
  type PromptTarget,
} from './promptSuggestions';

/**
 * Home's Suno-style prompt bar: it rotates rainbow-swept suggestions, lets the
 * student pick a destination, and on Go opens the place in the app the prompt
 * asks for (promptRouting.ts). The prompt rides along in the route's state
 * (`homePrompt`) for the page, or the prompt agent, to read later.
 */
export const HomePromptBar = () => {
  const reduce = useReducedMotion();
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [target, setTarget] = useState<PromptTarget | null>(null);
  const navigate = useNavigate();
  const { match } = useAssistantMatcher();
  /** The suggestion the student accepted (Tab / dice). */
  const [accepted, setAccepted] = useState<PromptSuggestion | null>(null);
  const [index, setIndex] = useState(0);
  /**
   * Counts Tab accepts, so each one replays Go's rainbow sweep; 0 once the
   * text changes (typing, the dice), which stops a sweep mid-run.
   */
  const [sweep, setSweep] = useState(0);

  // A new random order for each visit and each target picked.
  const pool = useMemo(() => rotationFor(target), [target]);
  const suggestion = pool[index % pool.length];
  const empty = value.trim().length === 0;

  // Rotate while the field is empty; restart from the top when the pool changes.
  useEffect(() => setIndex(0), [target]);
  useEffect(() => {
    if (!empty) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [empty, target]);

  // Grow with the text, up to the max height in the class list.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const accept = (s: PromptSuggestion) => {
    setValue(s.text);
    setAccepted(s);
    textareaRef.current?.focus();
  };

  const roll = () => {
    setSweep(0);
    const options = pool.filter((s) => s.text !== value);
    accept(options[Math.floor(Math.random() * options.length)] ?? pool[0]);
  };

  // Where Go will open, worked out as the student types, so its label can
  // name the area: Studio, Learn, Globe or Arcade; plain "Go" for anywhere
  // else (the app search) or an empty bar.
  const route = useMemo(
    () =>
      empty
        ? null
        : resolvePromptRoute({ text: value, target, accepted, match }),
    [empty, value, target, accepted, match],
  );
  const area = route ? areaOf(route) : null;
  const goLabel = PROMPT_TARGETS.find((t) => t.id === area)?.label ?? 'Go';

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!route) return;
    navigate(route, { state: { homePrompt: value.trim() } });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Tab' && !e.shiftKey && empty && suggestion) {
      e.preventDefault();
      accept(suggestion);
      setSweep((n) => n + 1);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn(PROMPT_FRAME, PROMPT_WASH, 'max-w-[680px]')}
    >
      <label htmlFor={inputId} className="sr-only">
        Describe what you want to make, learn, explore, or play
      </label>
      <div className="relative px-5 pt-4">
        <textarea
          ref={textareaRef}
          id={inputId}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSweep(0);
            if (e.target.value === '') setAccepted(null);
          }}
          onKeyDown={onKeyDown}
          className={PROMPT_TEXTAREA}
        />
        {empty && suggestion && (
          <RotatingSuggestion text={suggestion.text} reduce={!!reduce} />
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pt-3 pb-3">
        <div
          role="radiogroup"
          aria-label="Send to"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PROMPT_TARGETS.map((t) => {
            const on = target === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTarget(on ? null : t.id)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  on
                    ? 'border-white/20 bg-white/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/85',
                )}
              >
                <img
                  src={t.iconSrc}
                  alt=""
                  draggable={false}
                  className={cn('size-4', on ? 'opacity-100' : 'opacity-60')}
                />
                {t.label}
              </button>
            );
          })}
        </div>

        <DiceButton onClick={roll} />
        <GoButton disabled={empty} sweep={sweep} reduce={!!reduce}>
          {goLabel}
        </GoButton>
      </div>
    </form>
  );
};
