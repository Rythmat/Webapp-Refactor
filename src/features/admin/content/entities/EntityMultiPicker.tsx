import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import { kindLabel } from '../graph/graphVocabulary';
import { CreateEntityDialog } from './CreateEntityDialog';
import { PickerList } from './EntityPicker';
import { isCreatable, type PickerKind } from './entityKinds';
import { useEntityIndex } from './useEntityIndex';

/**
 * Pick several records of a kind: a bare-id array (a record's `artistIds`, a
 * song's `subgenreIds`). Chips in order, removable; an adder with the same
 * ranking as `EntityPicker`, which leaves out what is already chosen.
 * Backspace in an empty search removes the last chip. Bare ids carry no
 * unconfirmed flag or source — those live on `RefRow` fields only.
 *
 * `kind` may be several kinds that share one list: an artist's `genreIds`
 * holds genres and subgenres alike (the two vocabularies share no id, and
 * the graph files each id at whichever level it belongs to). Then the adder
 * searches them all, and a chip says which it is where the entry has a
 * second line — a subgenre's genre ("Kwaito · Southern African"). Creating
 * from the adder is for one creatable kind only.
 */
export const EntityMultiPicker = ({
  kind,
  value,
  onChange,
  allowCreate = false,
  context,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  kind: PickerKind | readonly PickerKind[];
  value: readonly string[];
  onChange(next: string[]): void;
  allowCreate?: boolean;
  context?: ReadonlySet<string>;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) => {
  const kindsKey = typeof kind === 'string' ? kind : kind.join(',');
  const kinds = useMemo(
    () => (typeof kind === 'string' ? [kind] : [...kind]),
    // Keyed on the kinds' names: callers may pass a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kindsKey],
  );
  const first = kinds[0];
  const several = kinds.length > 1;
  const { entries, loading } = useEntityIndex(kinds);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const chosen = useMemo(() => new Set(value), [value]);
  const entryOf = (slug: string) =>
    entries.find(
      (e) => kinds.includes(e.kind as PickerKind) && e.slug === slug,
    );
  const creatable = !several && allowCreate && isCreatable(first);

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? kindLabel(first)}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {value.map((slug) => {
        const entry = entryOf(slug);
        const name = entry?.name;
        // Which of the kinds it is, when the list holds several.
        const hint = several ? entry?.hint : undefined;
        return (
          <span
            key={slug}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs',
              name
                ? 'border-white/[0.12] text-white/85'
                : 'border-amber-300/40 text-amber-300',
            )}
            title={
              entry
                ? `${entry.kind}:${slug}${hint ? ` · in ${hint}` : ''}`
                : 'No record has this id'
            }
          >
            {name ?? `${slug} (not found)`}
            {hint && <span className="text-white/40">· {hint}</span>}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${name ?? slug}`}
                onClick={() => onChange(value.filter((s) => s !== slug))}
                className="text-white/40 hover:text-white"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        );
      })}
      {disabled && value.length === 0 && (
        <span className="text-xs text-white/35">None</span>
      )}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            aria-label={`Add ${kindLabel(first).toLowerCase()}`}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-white/[0.18] px-2.5 text-xs text-white/55 hover:border-white/30 hover:text-white"
          >
            <Plus className="size-3" />
            Add
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <PickerList
              kind={first}
              entries={entries}
              context={context}
              exclude={chosen}
              onPick={(entry) => onChange([...value, entry.slug])}
              loading={loading}
              // Not while the served records load (see EntityPicker).
              onCreate={
                creatable && !loading
                  ? (name) => {
                      setOpen(false);
                      setCreating(name);
                    }
                  : undefined
              }
              onBackspaceEmpty={
                value.length ? () => onChange(value.slice(0, -1)) : undefined
              }
            />
          </PopoverContent>
        </Popover>
      )}
      {creating !== null && (
        <CreateEntityDialog
          kind={first}
          initialName={creating}
          existing={entries}
          onClose={() => setCreating(null)}
          onCreated={(entry) => {
            setCreating(null);
            if (!chosen.has(entry.slug)) onChange([...value, entry.slug]);
          }}
        />
      )}
    </div>
  );
};
