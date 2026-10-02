import {
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/components/utilities';
import { composing, EDITOR_INPUT, EditorProblem, moveFor } from './EditorParts';
import { draftOf, type InlineEditor as InlineDef, readDraft } from './parse';
import type { CellEditorProps } from './types';

/**
 * A text box in the cell, for every scalar that is typed: a name or title,
 * a number, a year, a span of years, coordinates (`parse.ts` reads each).
 *
 * The draft is the box's own state, so typing re-renders the box and
 * nothing else; a ref mirrors it for the grid (`handle`), which reads it
 * when the edit ends without the box's keys. Opened by Enter, F2 or a
 * second click, the box holds the value selected, to type over; opened by
 * a typed key, it holds that key.
 *
 * Enter, Shift+Enter, Tab and Shift+Tab write the draft and move; Esc
 * leaves the cell as it was (none of them while an input method is
 * composing: its keys are its own). A draft that cannot be written stays,
 * with `aria-invalid` and the reason beside the cell, until it is put
 * right or let go. Focus moving elsewhere on the page writes it too; focus leaving
 * the window (another app, another tab) does not end the edit.
 */

const PLACEHOLDER: Record<InlineDef['type'], string | undefined> = {
  text: undefined,
  number: undefined,
  year: 'Year',
  range: '1961–1984',
  coords: 'lat, lng',
};

const INPUT_MODE: Record<InlineDef['type'], 'text' | 'numeric' | 'decimal'> = {
  text: 'text',
  number: 'numeric',
  year: 'numeric',
  range: 'text',
  coords: 'decimal',
};

export const InlineEditor = ({
  editor,
  name,
  label,
  values,
  seed,
  handle,
  onCommit,
  onCancel,
  onLeave,
}: Omit<CellEditorProps, 'editor'> & { editor: InlineDef }) => {
  const [text, setText] = useState(() => seed ?? draftOf(editor, values));
  const [problem, setProblem] = useState<string | null>(null);
  const draft = useRef(text);
  const box = useRef<HTMLInputElement>(null);
  const problemId = useId();

  // The grid's way to the draft, for an edit that ends some other way.
  useLayoutEffect(() => {
    handle.current = { read: () => readDraft(editor, draft.current, name) };
  }, [handle, editor, name]);

  // Focus moves into the box before the next key is read (a layout effect,
  // not a passive one: keys typed fast after the first would otherwise
  // reach the grid): the value selected, or the caret after the key that
  // opened it.
  useLayoutEffect(() => {
    const input = box.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    if (seed === undefined) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing(event)) return;
    const move = moveFor(event);
    if (move) {
      event.preventDefault();
      event.stopPropagation();
      const read = readDraft(editor, draft.current, name);
      if (read.type === 'commit') onCommit(read.values, move);
      else if (read.type === 'invalid') setProblem(read.message);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <EditorProblem id={problemId} message={problem}>
      <input
        ref={box}
        type="text"
        aria-label={label}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? problemId : undefined}
        inputMode={INPUT_MODE[editor.type]}
        placeholder={PLACEHOLDER[editor.type]}
        autoComplete="off"
        spellCheck={editor.type === 'text'}
        value={text}
        onChange={(event) => {
          draft.current = event.target.value;
          setText(event.target.value);
          if (problem) setProblem(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Another window or tab took the focus: the edit waits for it.
          if (document.hasFocus()) onLeave();
        }}
        className={cn(
          EDITOR_INPUT,
          problem ? 'border-red-400/70' : 'border-white/30',
        )}
      />
    </EditorProblem>
  );
};
