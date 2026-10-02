import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import {
  chordFieldsOf,
  progressionErrors,
  suggestComplexity,
} from '@/curriculum/engine/progressionValidation';
import { useChordNotation } from '@/lib/chordNotation';
import { ChordChipEditor } from '../../../content/chords/ChordChipEditor';
import { chordNamer } from '../../../content/chords/chordPicker';
import { useProgressionCorpus } from '../../../content/chords/useProgressionCorpus';
import type { CellValues, ScalarEditor } from '../cellValues';
import { EDITOR_INPUT, EDITOR_POPOVER } from './EditorParts';
import type { CellEditorProps, EditorRead } from './types';

/**
 * A progression's Chords cell, edited as the row panel edits them: the
 * chip editor (ChordChipEditor) in a popover beside the cell, with the cell
 * showing the draft as it changes.
 *
 * It opens on the chords, focus on the last chip; a key typed on the cell
 * opens the picker with that key searched instead. Inside, the chips' own
 * keys work (←/→, Alt+←/→ to move, Delete, Enter to replace), and Tab moves
 * between them and the buttons, so it is not the cell's "write and move
 * right" here. ⌘/Ctrl+Enter or Save writes the chords with the fields that
 * follow from them (`progression`, `chordCount`, `startingChord`,
 * `startingDegree`) and goes down a row; Esc leaves the cell as it was
 * (Esc in the picker closes the picker first). A click or focus outside
 * writes the draft if it keeps the library's rules, as any cell's edit
 * does, and lets it go with the reason said if it does not.
 *
 * The draft is held to the library's rules as it changes, against the
 * library's other progressions: a chord Prism does not know, fewer than two
 * or more than seven, a copy of another progression. A problem the chords
 * had when the cell opened is not this edit's to fix. The server checks
 * the same again when the write arrives.
 */

type ChordsDef = Extract<ScalarEditor, { type: 'chords' }>;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export const ChordsCellEditor = ({
  name: columnName,
  label,
  values,
  seed,
  handle,
  onCommit,
  onCancel,
  onLeave,
}: Omit<CellEditorProps, 'editor'> & { editor: ChordsDef }) => {
  const opened = useMemo(() => strings(values.chords), [values]);
  const [draft, setDraft] = useState<string[]>(opened);
  const corpus = useProgressionCorpus();
  const notation = useChordNotation();
  const name = useMemo(() => chordNamer(notation), [notation]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const problemId = useId();

  const changed = !same(draft, opened);
  const problem = useMemo(() => {
    if (!changed) return null;
    const errors = progressionErrors(
      { ...chordFieldsOf(draft) },
      {
        others: corpus.entries,
        before: { ...chordFieldsOf(opened) },
      },
    ).filter((issue) => issue.rule !== 'id');
    return errors.length ? errors[0].message : null;
  }, [changed, draft, opened, corpus.entries]);

  const read = (): EditorRead =>
    !changed
      ? { type: 'cancel' }
      : problem
        ? { type: 'invalid', message: problem }
        : { type: 'commit', values: { ...chordFieldsOf(draft) } as CellValues };

  // The grid's way to the draft, for an edit that ends some other way: the
  // draft as of the last render.
  useLayoutEffect(() => {
    handle.current = { read };
  });

  const save = () => {
    const now = read();
    if (now.type === 'commit') onCommit(now.values, 'down');
    else if (now.type === 'cancel') onCommit(values, 'down');
  };

  const suggested = suggestComplexity(draft);

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          aria-hidden
          className={cn(
            EDITOR_INPUT,
            'flex items-center truncate',
            problem ? 'border-red-400/70' : 'border-white/30',
          )}
        >
          <span className="truncate">
            {draft.length ? draft.map(name).join(' → ') : 'No chords'}
          </span>
        </div>
      </PopoverAnchor>
      <PopoverContent
        role="dialog"
        aria-label={label}
        side="bottom"
        align="start"
        sideOffset={4}
        hideWhenDetached
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // A click on the cell itself is still the edit.
          if (anchorRef.current?.contains(event.target as Node)) return;
          onLeave();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
        className={cn(EDITOR_POPOVER, 'flex w-[26rem] flex-col gap-3 p-3')}
      >
        <ChordChipEditor
          chords={draft}
          onChange={setDraft}
          label={columnName}
          frequency={corpus.frequency}
          name={name}
          initialSearch={seed}
          autoFocus
          onEscape={onCancel}
          onSubmit={save}
          describedBy={problem ? problemId : undefined}
          invalid={!!problem}
        />
        {problem ? (
          <p id={problemId} role="alert" className="text-xs text-red-200">
            {problem}
          </p>
        ) : (
          changed &&
          suggested && (
            <p className="text-xs text-white/45">
              Its chords suggest the complexity {suggested}. The Complexity
              column sets it.
            </p>
          )
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-white/35">
            ⌘↵ saves · Esc leaves it as it was
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!!problem} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
