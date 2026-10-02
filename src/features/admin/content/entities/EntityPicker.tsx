import { ChevronsUpDown, Plus, X } from 'lucide-react';
import { type KeyboardEvent, useMemo, useState } from 'react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import type { EntityKind } from '@/content/graph/types';
import { kindLabel } from '../graph/graphVocabulary';
import { CreateEntityDialog } from './CreateEntityDialog';
import { isCreatable, type PickerKind } from './entityKinds';
import {
  type EntityEntry,
  type RankedEntity,
  rankEntities,
} from './rankEntities';
import { useEntityIndex } from './useEntityIndex';

/**
 * Pick one record of a kind by name (design §3.4). The value is the bare
 * slug — the field's name says the kind — and `null` clears it.
 *
 * Built on cmdk inside the popover, with cmdk's own filtering off: the
 * ranking is `rankEntities`, so an alias hit reads "→ Andy Grammer (alias)"
 * and writes the canonical slug. ↑/↓ and Enter pick, Tab takes the top hit,
 * ⌘Enter creates what was typed (where the kind can be created). A value the
 * index does not know is shown as-is and flagged, never silently dropped.
 */

interface EntityPickerProps {
  kind: PickerKind;
  value: string | null | undefined;
  onChange(slug: string | null, entry?: EntityEntry): void;
  /** What the field holds as text today — offered as the first search. */
  suggestion?: string;
  placeholder?: string;
  /** Records to lift in the ranking: the song's other artists, say. */
  context?: ReadonlySet<string>;
  /** Offer "Create …" when nothing matches exactly. */
  allowCreate?: boolean;
  /**
   * For a place created from here: whether it starts as a globe pin. A
   * birthplace or the town a song was recorded in is a place without being
   * a pin (design §5.1), so those pickers pass false.
   */
  newPlacePin?: boolean;
  disabled?: boolean;
  /** Shown instead of the picker when the field cannot be written yet. */
  readOnlyReason?: string;
  className?: string;
  'aria-label'?: string;
}

export const EntityPicker = ({
  kind,
  value,
  onChange,
  suggestion,
  placeholder,
  context,
  allowCreate = false,
  newPlacePin = true,
  disabled,
  readOnlyReason,
  className,
  'aria-label': ariaLabel,
}: EntityPickerProps) => {
  const { entries, loading } = useEntityIndex(useMemo(() => [kind], [kind]));
  const current = value
    ? entries.find((e) => e.slug === value && e.kind === kind)
    : undefined;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const pick = (entry: EntityEntry) => {
    onChange(entry.slug, entry);
    setOpen(false);
  };

  if (readOnlyReason) {
    return (
      <span
        className={cn('text-sm text-white/60', className)}
        title={readOnlyReason}
      >
        {current?.name ?? value ?? suggestion ?? '—'}
      </span>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          aria-label={ariaLabel ?? `Choose ${kindLabel(kind).toLowerCase()}`}
          className={cn(
            'inline-flex h-8 min-w-40 max-w-full items-center justify-between gap-2 rounded-full border border-white/[0.12] px-3 text-left text-sm transition-colors hover:border-white/25 disabled:opacity-50',
            className,
          )}
        >
          <span className="truncate">
            {current ? (
              <span className="text-white">{current.name}</span>
            ) : value ? (
              <span
                className="text-amber-300"
                title="No record has this id — pick one, or create it"
              >
                {value} (not found)
              </span>
            ) : (
              <span className="text-white/40">
                {placeholder ??
                  (suggestion
                    ? `Link “${suggestion}”…`
                    : `Choose ${kindLabel(kind).toLowerCase()}…`)}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-white/40" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <PickerList
            kind={kind}
            entries={entries}
            initialQuery={current ? '' : (suggestion ?? '')}
            context={context}
            loading={loading}
            onPick={pick}
            // Not while the served records load: until they are in, "no
            // match" may only mean "not loaded yet", and the new record
            // would take an id that exists.
            onCreate={
              allowCreate && isCreatable(kind) && !loading
                ? (name) => {
                    setOpen(false);
                    setCreating(name);
                  }
                : undefined
            }
            onClear={
              value
                ? () => {
                    onChange(null);
                    setOpen(false);
                  }
                : undefined
            }
          />
        </PopoverContent>
      </Popover>
      {creating !== null && (
        <CreateEntityDialog
          kind={kind}
          initialName={creating}
          existing={entries}
          pin={newPlacePin}
          onClose={() => setCreating(null)}
          onCreated={(entry) => {
            setCreating(null);
            onChange(entry.slug, entry);
          }}
        />
      )}
    </>
  );
};

/**
 * The search box and ranked list, shared by the single and multi pickers —
 * and by anything else that picks a node by name (the Table's Link…, which
 * picks events and progressions too): `kind` only names what is searched.
 */
export const PickerList = ({
  kind,
  entries,
  initialQuery = '',
  context,
  exclude,
  onPick,
  onCreate,
  onClear,
  onBackspaceEmpty,
  loading = false,
}: {
  kind: EntityKind;
  entries: readonly EntityEntry[];
  /** The served records are still loading: no match may only mean not yet. */
  loading?: boolean;
  initialQuery?: string;
  context?: ReadonlySet<string>;
  /** Slugs already chosen (a multi picker's chips). */
  exclude?: ReadonlySet<string>;
  onPick(entry: EntityEntry): void;
  onCreate?: (name: string) => void;
  onClear?: () => void;
  onBackspaceEmpty?: () => void;
}) => {
  const [query, setQuery] = useState(initialQuery);
  const results: RankedEntity[] = useMemo(
    () =>
      rankEntities(
        exclude ? entries.filter((e) => !exclude.has(e.slug)) : entries,
        query,
        { context },
      ),
    [entries, query, context, exclude],
  );
  const exact = results.some(
    (r) => r.tier === 'exact' || r.tier === 'alias' || r.tier === 'normalized',
  );
  const canCreate = !!onCreate && query.trim().length > 1 && !exact;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && results[0] && !event.shiftKey) {
      event.preventDefault();
      onPick(results[0].entry);
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      if (canCreate) {
        event.preventDefault();
        onCreate!(query.trim());
      }
    } else if (event.key === 'Backspace' && !query && onBackspaceEmpty) {
      onBackspaceEmpty();
    }
  };

  return (
    <Command shouldFilter={false} loop>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        onKeyDown={onKeyDown}
        placeholder={`Find ${kindLabel(kind).toLowerCase()}…`}
      />
      <CommandList>
        {query.trim() && results.length === 0 && !canCreate && (
          <p className="px-3 py-4 text-center text-sm text-white/45">
            {loading ? 'Still loading the records…' : 'Nothing called that.'}
          </p>
        )}
        {results.length > 0 && (
          <CommandGroup>
            {results.map((r) => (
              <CommandItem
                key={r.entry.id}
                value={r.entry.id}
                onSelect={() => onPick(r.entry)}
                className="flex items-center gap-2"
              >
                <span className="min-w-0 flex-1 truncate">
                  {r.tier === 'alias' ? (
                    <>
                      <span className="text-white/50">{r.matched} → </span>
                      {r.entry.name}
                      <span className="text-white/40"> (alias)</span>
                    </>
                  ) : (
                    r.entry.name
                  )}
                  {r.entry.hint && (
                    <span className="block truncate text-xs text-white/40">
                      {r.entry.hint}
                    </span>
                  )}
                </span>
                {r.entry.source !== 'repo' &&
                  r.entry.source !== 'published' && (
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 text-[10px] uppercase tracking-wide text-white/50">
                      {r.entry.source}
                    </span>
                  )}
                {r.tier === 'fuzzy' && (
                  <span className="shrink-0 text-[10px] text-white/35">
                    close
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(canCreate || onClear) && (
          <CommandGroup>
            {canCreate && (
              <CommandItem
                value={`create:${query}`}
                onSelect={() => onCreate!(query.trim())}
                className="flex items-center gap-2"
              >
                <Plus className="size-3.5" />
                Create “{query.trim()}”
                <span className="ml-auto text-[10px] text-white/35">⌘↵</span>
              </CommandItem>
            )}
            {onClear && (
              <CommandItem
                value="clear"
                onSelect={onClear}
                className="flex items-center gap-2 text-white/60"
              >
                <X className="size-3.5" />
                Clear
              </CommandItem>
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
};
