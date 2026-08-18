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
  'cursor-text rounded transition-colors hover:bg-white/10 hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/25';

const INPUT_RESET =
  'bg-transparent outline-none ring-1 ring-[#60a5fa] rounded px-0.5 -mx-0.5';

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

/** Select all on focus so a click-to-edit replaces rather than appends. */
const useAutoFocus = <T extends HTMLInputElement | HTMLTextAreaElement>(
  active: boolean,
) => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!active) return;
    ref.current?.focus();
    ref.current?.select();
  }, [active]);
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
  const ref = useAutoFocus<HTMLInputElement>(editing);

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
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
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
  const ref = useAutoFocus<HTMLTextAreaElement>(editing);

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
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
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
          'hover:bg-white/10 focus:ring-1 focus:ring-[#60a5fa]',
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
}> = ({
  values,
  onChange,
  renderTag,
  addLabel = 'Add',
  ariaLabel,
  className,
}) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useAutoFocus<HTMLInputElement>(adding);

  const commit = () => {
    const next = draft.trim();
    setAdding(false);
    setDraft('');
    if (next && !values.includes(next)) onChange([...values, next]);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="group inline-flex items-center gap-1"
        >
          {renderTag ? (
            renderTag(value)
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
      ))}

      {adding ? (
        <input
          ref={ref}
          aria-label={`${ariaLabel} — new entry`}
          className={cn(INPUT_RESET, 'w-28 text-xs')}
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
              setDraft('');
              setAdding(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          aria-label={`${ariaLabel} — ${addLabel.toLowerCase()}`}
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-xs text-white/40 transition-colors hover:border-white/40 hover:text-white/80"
          onClick={() => setAdding(true)}
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
}> = ({ label, children, className }) => (
  <div className={cn('min-w-0', className)}>
    <div className="text-[10px] uppercase tracking-wide text-white/30">
      {label}
    </div>
    <div className="text-sm text-white/80">{children}</div>
  </div>
);
