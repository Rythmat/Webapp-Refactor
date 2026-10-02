import { useId, type ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * A reference plus how sure we are of it: the picker, an "unconfirmed"
 * toggle, and where the fact comes from.
 *
 * Only for the fields whose schema holds the flags — credits, the session,
 * related recordings, a song's records, a group's members (RefMeta in
 * src/content/records/types.ts). Bare-id arrays have no RefRow; there is
 * nowhere to keep the answer. Unconfirmed reads muted and italic, the way the
 * song page's credits show it.
 */

export const SOURCE_SUGGESTIONS = [
  'discogs',
  'wikipedia',
  'allmusic',
  'liner notes',
] as const;

export interface RefMetaValue {
  unverified?: boolean;
  source?: string;
}

export const RefRow = ({
  meta,
  onMeta,
  children,
  showSource = true,
  flagsDisabled,
  trailing,
  className,
}: {
  meta: RefMetaValue;
  onMeta(next: RefMetaValue): void;
  /** The picker, and whatever else the row edits (role, instrument). */
  children: ReactNode;
  /**
   * False where the schema has the flag but not yet the source: a song's
   * `source` fields are v2, its `unverified` flags are v1.
   */
  showSource?: boolean;
  /**
   * Why the flags cannot be set yet, when they cannot: a row with nothing
   * in it yet has nothing to be unconfirmed about, and would drop them.
   */
  flagsDisabled?: string;
  /** After the flags: the row's remove button. */
  trailing?: ReactNode;
  className?: string;
}) => {
  const listId = useId();
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        meta.unverified && 'italic opacity-70',
        className,
      )}
    >
      {children}
      <label
        className="inline-flex items-center gap-1.5 text-xs not-italic text-white/55"
        title={flagsDisabled}
      >
        <input
          type="checkbox"
          disabled={!!flagsDisabled}
          checked={!!meta.unverified}
          onChange={(e) =>
            onMeta({ ...meta, unverified: e.target.checked || undefined })
          }
        />
        Unconfirmed
      </label>
      {showSource && (
        <input
          aria-label="Source"
          list={listId}
          disabled={!!flagsDisabled}
          title={flagsDisabled}
          value={meta.source ?? ''}
          onChange={(e) =>
            onMeta({ ...meta, source: e.target.value || undefined })
          }
          placeholder="Source"
          className="h-7 w-28 rounded-full border border-white/[0.1] bg-transparent px-2.5 text-xs not-italic text-white/70 placeholder:text-white/30 focus:border-white/25 focus:outline-none disabled:opacity-50"
        />
      )}
      {showSource && (
        <datalist id={listId}>
          {SOURCE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {trailing}
    </div>
  );
};
