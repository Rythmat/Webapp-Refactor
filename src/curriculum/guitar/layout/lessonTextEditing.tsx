import {
  createContext,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { caretFromClick, placeCaret } from '@/lib/caretFromClick';

/**
 * A lesson's words edited where they show, for the console's in-place lesson
 * editor only (features/admin/content/lessons/LessonEditor.tsx). Nothing in
 * the app provides it, so students' lessons draw their text as text. Given,
 * the lesson header's section name and step title become click-to-edit,
 * on the words as written rather than as the chord spelling shows them.
 */
export interface LessonTextEditing {
  /** The step's activity line as written: "B1.1: 1-7 Shells (Out of Time)". */
  activity: string;
  setActivity: (activity: string) => void;
  /** The section's name as written: "Chords". */
  sectionName: string;
  setSectionName: (name: string) => void;
  /** The step's chord symbols as written, one a bar: ['Dm7', 'G7']. */
  chordSymbols: string[];
  setChordSymbols: (symbols: string[]) => void;
}

/**
 * Chord symbols as typed, one a bar: "Dm7 G7 Cmaj7", or with bars marked
 * ("Dm7 | G7", "Dm7, G7"), or as the lesson shows them ("C maj7", "D min7",
 * B♭7). Null when one of them isn't a chord this app reads.
 */
export function parseChordList(text: string): string[] | null {
  const tokens = text
    .split(/\s*(?:\||,|→|->)\s*|\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  // A quality on its own ("C maj7") belongs to the root before it.
  const quality = /^(?:maj|min|dom|m|M|sus|dim|aug|add|alt|ø|°|Δ|\+|\d|\(|\/)/;
  const glued: string[] = [];
  for (const token of tokens) {
    if (glued.length && quality.test(token)) glued[glued.length - 1] += token;
    else glued.push(token);
  }
  const symbols = glued.map((s) =>
    s
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#')
      .replace(/dom(?=\d)/g, '')
      .replace(/min(?!or)/g, 'm'),
  );
  return symbols.every((s) => chordSymbolTones(s)) ? symbols : null;
}

export const LessonTextEditingContext = createContext<LessonTextEditing | null>(
  null,
);

/**
 * Words that become an input when clicked: Enter or clicking away keeps the
 * change, Escape drops it. `children` is how they show; `value` is what is
 * edited.
 */
export function EditableText({
  value,
  onChange,
  label,
  children,
  valid = (draft) => draft.trim().length > 0,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  /** What the input is, for a screen reader: "Step title". */
  label: string;
  children: ReactNode;
  /** Whether a draft can be kept; one that can't stays open, marked. */
  valid?: (draft: string) => boolean;
  /** What to type, shown while the input is open. */
  hint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [refused, setRefused] = useState(false);
  // The caret opens where the words were clicked, when they read as edited
  // (the chord line shows "D min7" for Dm7: there it opens at the end).
  const caret = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!editing || !input.current) return;
    input.current.focus();
    placeCaret(input.current, caret.current);
  }, [editing]);
  const open = (event?: MouseEvent<HTMLElement>) => {
    caret.current =
      event && event.currentTarget.textContent === value
        ? caretFromClick(event)
        : null;
    setDraft(value);
    setRefused(false);
    setEditing(true);
  };
  const keep = () => {
    if (draft === value) return setEditing(false);
    if (!valid(draft)) return setRefused(true);
    setEditing(false);
    onChange(draft);
  };

  if (editing)
    return (
      <input
        ref={input}
        aria-label={label}
        aria-invalid={refused || undefined}
        title={hint}
        placeholder={hint}
        value={draft}
        size={Math.max(8, draft.length + 1)}
        onChange={(e) => {
          setDraft(e.target.value);
          setRefused(false);
        }}
        onBlur={() => {
          // Leaving a draft that can't be kept drops it.
          if (draft !== value && !valid(draft)) setEditing(false);
          else keep();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            keep();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
          }
          // The lesson's own keys (arrows step through it) stay out of it.
          e.stopPropagation();
        }}
        className={cn(
          'max-w-full rounded bg-white/10 px-1 text-inherit outline-none ring-1',
          refused ? 'ring-red-400' : 'ring-white/40',
        )}
      />
    );
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${label} — click to edit`}
      title="Click to edit"
      onClick={(e) => open(e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        'cursor-text rounded decoration-white/40 decoration-dotted underline-offset-4',
        'hover:bg-white/[0.06] hover:underline',
      )}
    >
      {children}
    </span>
  );
}
