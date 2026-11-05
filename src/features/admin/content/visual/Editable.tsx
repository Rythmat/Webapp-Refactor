/* eslint-disable react/jsx-sort-props */
import { Plus, X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/utilities';
import { caretFromClick, placeCaret } from '@/lib/caretFromClick';
import { CONSOLE_LABEL } from '../../ui/styles';

/**
 * Click-to-edit primitives for the visual content editors.
 *
 * The whole premise of those editors is that the admin sees the page as the
 * student sees it, so an editable field must render as ordinary text until it
 * is clicked — a form control sitting in the hero would break the illusion the
 * editor exists to create. Each control therefore renders display text with a
 * hover affordance, swaps to a real input on click, commits on blur or Enter,
 * and reverts on Escape.
 *
 * `className` is applied to BOTH the display node and the input so the text
 * does not jump size or weight when it enters edit mode.
 */

/** Dotted hover outline that marks a region as editable. */
const EDIT_AFFORDANCE =
  'cursor-text rounded transition-colors hover:bg-white/[0.04] hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40';

const INPUT_RESET =
  'bg-transparent outline-none ring-1 ring-white/60 rounded px-0.5 -mx-0.5';

/**
 * Size a single-line input to its content in `ch`, so the field occupies the
 * same space as the text it replaced. A percentage width would collapse to the
 * browser's default input size inside the inline, shrink-to-fit containers
 * these sit in — a two-word section label would jump to a 20-character box the
 * moment it was clicked.
 */
const contentWidth = (text: string, minChars: number) => ({
  width: `${Math.max(minChars, text.length + 1)}ch`,
  maxWidth: '100%',
});

/**
 * Focus a field as it opens. Text opens with its caret where it was clicked
 * (`caret`, else at the end), so a word can be changed without retyping the
 * rest (owner, 3 Nov 2026: selecting it all meant the first key wiped it
 * out). A number, or a new entry, opens selected, to type over.
 */
const useAutoFocus = <T extends HTMLInputElement | HTMLTextAreaElement>(
  active: boolean,
  caret?: { current: number | null },
) => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!active || !ref.current) return;
    ref.current.focus();
    if (caret) placeCaret(ref.current, caret.current);
    else ref.current.select();
  }, [active, caret]);
  return ref;
};

export const InlineText: FC<{
  value: string | undefined;
  onChange: (value: string) => void;
  /** Shown greyed when the value is empty — the click target must never be 0px. */
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}> = ({
  value,
  onChange,
  placeholder = 'Click to edit',
  className,
  ariaLabel,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const caret = useRef<number | null>(null);
  const ref = useAutoFocus<HTMLInputElement>(editing, caret);

  useEffect(() => setDraft(value ?? ''), [value]);

  if (editing) {
    return (
      <input
        ref={ref}
        aria-label={ariaLabel}
        className={cn(INPUT_RESET, className)}
        style={contentWidth(draft, 8)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setEditing(false);
            onChange(draft);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${ariaLabel} — click to edit`}
      className={cn(EDIT_AFFORDANCE, className, !value && 'text-white/30')}
      onClick={(e) => {
        caret.current = value ? caretFromClick(e) : null;
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          caret.current = null;
          setEditing(true);
        }
      }}
    >
      {value || placeholder}
    </span>
  );
};

export const InlineTextarea: FC<{
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  ariaLabel: string;
}> = ({
  value,
  onChange,
  placeholder = 'Click to write…',
  className,
  rows = 4,
  ariaLabel,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const caret = useRef<number | null>(null);
  const ref = useAutoFocus<HTMLTextAreaElement>(editing, caret);

  useEffect(() => setDraft(value ?? ''), [value]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        aria-label={ariaLabel}
        rows={rows}
        className={cn(INPUT_RESET, 'block w-full resize-y', className)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onChange(draft);
        }}
        onKeyDown={(e) => {
          // Enter inserts a newline here; Escape reverts, Cmd/Ctrl+Enter commits.
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value ?? '');
            setEditing(false);
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setEditing(false);
            onChange(draft);
          }
        }}
      />
    );
  }

  return (
    <p
      role="button"
      tabIndex={0}
      aria-label={`${ariaLabel} — click to edit`}
      className={cn(
        EDIT_AFFORDANCE,
        'block whitespace-pre-wrap',
        className,
        !value && 'text-white/30',
      )}
      onClick={(e) => {
        caret.current = value ? caretFromClick(e) : null;
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          caret.current = null;
          setEditing(true);
        }
      }}
    >
      {value || placeholder}
    </p>
  );
};

export const InlineNumber: FC<{
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered after the value in display mode, e.g. " BPM". Not editable. */
  suffix?: ReactNode;
  ariaLabel: string;
}> = ({
  value,
  onChange,
  placeholder = '—',
  className,
  min,
  max,
  step = 1,
  suffix,
  ariaLabel,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const ref = useAutoFocus<HTMLInputElement>(editing);

  useEffect(() => setDraft(value == null ? '' : String(value)), [value]);

  // Empty clears an optional numeric field rather than writing NaN.
  const commit = () => {
    setEditing(false);
    onChange(draft.trim() === '' ? undefined : Number(draft));
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        className={cn(INPUT_RESET, 'w-20 tabular-nums', className)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value == null ? '' : String(value));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${ariaLabel} — click to edit`}
      className={cn(
        EDIT_AFFORDANCE,
        className,
        value == null && 'text-white/30',
      )}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      {value == null ? placeholder : value}
      {value != null && suffix}
    </span>
  );
};

export const InlineSelect: FC<{
  value: string | undefined;
  onChange: (value: string) => void;
  options: readonly string[] | readonly { value: string; label: string }[];
  className?: string;
  placeholder?: string;
  ariaLabel: string;
}> = ({ value, onChange, options, className, placeholder, ariaLabel }) => {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-auto w-auto gap-1 border-none bg-transparent px-1 py-0 shadow-none',
          'hover:bg-white/[0.04] focus:ring-1 focus:ring-white/40',
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent>
        {normalized.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * A list of short strings (genres, tags, techniques, grooves) as removable
 * chips with an inline "add" input, rendered by a caller-supplied chip so the
 * editor can reuse the student's GenreBadge rather than imitating it.
 */
export const InlineTagList: FC<{
  values: string[];
  onChange: (values: string[]) => void;
  renderTag?: (value: string) => ReactNode;
  addLabel?: string;
  ariaLabel: string;
  className?: string;
  /**
   * A list in order, where a value comes again (a step's chords, one a bar:
   * C7 F7 C7 C7). Each chip opens in place, so bar 9 changes without
   * retyping bars 10–12.
   */
  ordered?: boolean;
  /**
   * Reads what's typed as one or more entries ('C7 | F7 | C7'); null when it
   * can't be read, and the field stays open, marked. Left out, what's typed
   * is one entry.
   */
  parse?: (text: string) => string[] | null;
}> = ({
  values,
  onChange,
  renderTag,
  addLabel = 'Add',
  ariaLabel,
  className,
  ordered = false,
  parse,
}) => {
  // The chip being changed, or the new entry. The ref keeps a blur that
  // follows Enter from committing twice.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const open = useRef<number | 'new' | null>(null);
  const [draft, setDraft] = useState('');
  const [refused, setRefused] = useState(false);
  const caret = useRef<number | null>(null);
  const ref = useAutoFocus<HTMLInputElement>(editing !== null, caret);

  const start = (at: number | 'new', text: string, caretAt: number | null) => {
    open.current = at;
    caret.current = caretAt;
    setDraft(text);
    setRefused(false);
    setEditing(at);
  };
  const close = () => {
    open.current = null;
    setEditing(null);
    setDraft('');
    setRefused(false);
  };

  /** Keeps the draft; `leaving`, one that can't be read is dropped. */
  const commit = (leaving: boolean) => {
    const at = open.current;
    if (at === null) return;
    const text = draft.trim();
    const typed = !text ? [] : parse ? parse(text) : [text];
    if (!typed) return leaving ? close() : setRefused(true);
    close();
    if (at === 'new') {
      const added = ordered
        ? typed
        : typed.filter((v, i) => !values.includes(v) && typed.indexOf(v) === i);
      if (added.length) onChange([...values, ...added]);
      return;
    }
    // A chip changed in place; emptied, it goes.
    const next = [...values.slice(0, at), ...typed, ...values.slice(at + 1)];
    if (next.join('\n') !== values.join('\n')) onChange(next);
  };

  const field = (
    <input
      ref={ref}
      aria-label={
        editing === 'new' ? `${ariaLabel} — new entry` : `${ariaLabel} — edit`
      }
      aria-invalid={refused || undefined}
      className={cn(
        INPUT_RESET,
        'text-xs',
        !ordered && 'w-28',
        refused && 'ring-red-400',
      )}
      style={ordered ? contentWidth(draft, 6) : undefined}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setRefused(false);
      }}
      onBlur={() => commit(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(false);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }}
    />
  );

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {values.map((value, index) =>
        editing === index ? (
          <span key={`${value}-${index}`}>{field}</span>
        ) : (
          <span
            key={`${value}-${index}`}
            className="group inline-flex items-center gap-1"
          >
            {renderTag ? (
              renderTag(value)
            ) : ordered ? (
              <span
                role="button"
                tabIndex={0}
                aria-label={`${ariaLabel} — change ${value}`}
                className={cn(
                  EDIT_AFFORDANCE,
                  'rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70',
                )}
                onClick={(e) => start(index, value, caretFromClick(e))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    start(index, value, null);
                  }
                }}
              >
                {value}
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                {value}
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              className="text-white/25 transition-colors hover:text-red-400"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              <X className="size-3" />
            </button>
          </span>
        ),
      )}

      {editing === 'new' ? (
        field
      ) : (
        <button
          type="button"
          aria-label={`${ariaLabel} — ${addLabel.toLowerCase()}`}
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-xs text-white/40 transition-colors hover:border-white/40 hover:text-white/80"
          onClick={() => start('new', '', null)}
        >
          <Plus className="size-3" />
          {addLabel}
        </button>
      )}
    </div>
  );
};

/** A labelled cell for the secondary detail strips. */
export const DetailCell: FC<{
  label: string;
  children: ReactNode;
  className?: string;
  /** The body paths it edits: its `data-field` anchor. */
  field?: string;
}> = ({ label, children, className, field }) => (
  <div data-field={field} className={cn('min-w-0', className)}>
    <div className={CONSOLE_LABEL}>{label}</div>
    <div className="text-sm text-white/80">{children}</div>
  </div>
);

/**
 * A square icon control for the editors' hover and row toolbars.
 *
 * Always labelled, because the icon is the only visible content: the toolbars
 * these sit in are dense enough that text would not fit, which makes
 * `aria-label` the sole name a screen reader or a hover tooltip has to work
 * with. `danger` tints destructive actions red on hover only, so a delete
 * button does not shout while the row is merely being read.
 */
export const IconButton: FC<{
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}> = ({ label, onClick, children, danger, active, disabled }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    className={`rounded p-1 transition-colors disabled:opacity-20 ${
      active ? 'bg-white/15 text-white' : 'text-white/40'
    } ${danger ? 'hover:bg-red-500/15 hover:text-red-400' : 'hover:bg-white/10 hover:text-white'}`}
    onClick={onClick}
  >
    {children}
  </button>
);
