import { useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoButton,
  PROMPT_FRAME,
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
  PROMPT_TEXTAREA,
  PROMPT_WASH,
  ROTATE_MS,
  RotatingSuggestion,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';
import { useAssistantMatcher } from '../dashboard/assistant/useAssistantMatcher';
import { areaOf, resolvePromptRoute } from './promptRouting';
import {
  PROMPT_TARGETS,
  rotationFor,
  rotationOf,
  type PromptSuggestion,
  type PromptTarget,
} from './promptSuggestions';

/**
 * Home's Suno-style prompt bar: it rotates rainbow-swept suggestions, lets the
 * student pick a destination, and on Go opens the place in the app the prompt
 * asks for (promptRouting.ts). The prompt rides along in the route's state
 * (`homePrompt`) for the page, or the prompt agent, to read later.
 *
 * `suggestions` gives the bar its own list to rotate (the Learn page: the
 * keyboard's); `showTargets={false}` drops the Studio / Learn / Globe /
 * Arcade picker, so Go goes wherever the prompt asks, and makes the bar one
 * row: Go beside the text; or, given `pills`, keeps the two rows with them
 * in the picker's place (the Learn page, owner 2026-10-24/25). `instrument`
 * sends its Theory prompts to that instrument's lessons (resolvePromptRoute).
 */
export const HomePromptBar = ({
  suggestions,
  showTargets = true,
  instrument,
  pills,
  ordered = false,
}: {
  suggestions?: readonly PromptSuggestion[];
  showTargets?: boolean;
  /** The instrument the bar is on: its Theory prompts open on it. */
  instrument?: LearnInstrument;
  /**
   * With `showTargets={false}`: the bar's own pills in its bottom row, Go
   * beside them (the Learn page's kinds or the Songs filters).
   */
  pills?: ReactNode;
  /** `suggestions` already in the order to rotate them (the Learn page's
   *  mixed list): not shuffled again. */
  ordered?: boolean;
} = {}) => {
  const reduce = useReducedMotion();
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [target, setTarget] = useState<PromptTarget | null>(null);
  const navigate = useNavigate();
  const { match } = useAssistantMatcher();
  /** The suggestion the student accepted (Tab). */
  const [accepted, setAccepted] = useState<PromptSuggestion | null>(null);
  const [index, setIndex] = useState(0);
  /**
   * Counts Tab accepts, so each one replays Go's rainbow sweep; 0 once the
   * text changes (typing), which stops a sweep mid-run.
   */
  const [sweep, setSweep] = useState(0);

  // A new random order for each visit and each target picked.
  const pool = useMemo(
    () =>
      suggestions
        ? ordered
          ? [...suggestions]
          : rotationOf(suggestions)
        : rotationFor(target),
    [suggestions, ordered, target],
  );
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

  // Where Go will open, worked out as the student types, so its label can
  // name the area: Studio, Learn, Globe or Arcade; plain "Go" for anywhere
  // else (the app search) or an empty bar.
  const route = useMemo(
    () =>
      empty
        ? null
        : resolvePromptRoute({
            text: value,
            target,
            accepted,
            match,
            suggestions,
            instrument,
          }),
    [empty, value, target, accepted, match, suggestions, instrument],
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

  const field = (
    <>
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
    </>
  );
  const go = (
    <GoButton disabled={empty} sweep={sweep} reduce={!!reduce}>
      {goLabel}
    </GoButton>
  );

  return (
    <form
      // Home's search keeps clear of it (HomeSearchPill's avoidId).
      id="home-prompt"
      onSubmit={submit}
      className={cn(PROMPT_FRAME, PROMPT_WASH, 'max-w-[42.5rem]')}
    >
      <label htmlFor={inputId} className="sr-only">
        Describe what you want to make, learn, explore, or play
      </label>
      {showTargets ? (
        <>
          <div className="relative px-5 pt-4">{field}</div>
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
                      PROMPT_PILL,
                      on ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
                    )}
                  >
                    <img
                      src={t.iconSrc}
                      alt=""
                      draggable={false}
                      className={cn(
                        'size-4',
                        on ? 'opacity-100' : 'opacity-60',
                      )}
                    />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {go}
          </div>
        </>
      ) : pills ? (
        <>
          <div className="relative px-5 pt-4">{field}</div>
          <div className="flex items-center gap-2 px-3 pt-3 pb-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {pills}
            </div>
            {go}
          </div>
        </>
      ) : (
        // No picker: one row, Go beside the text.
        <div className="flex items-center pr-3">
          <div className="relative min-w-0 flex-1 px-5 py-4">{field}</div>
          {go}
        </div>
      )}
    </form>
  );
};
