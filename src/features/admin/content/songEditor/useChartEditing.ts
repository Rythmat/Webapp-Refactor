import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Song, SongSection } from '@/curriculum/types/songLibrary';
import {
  copySelection,
  paste,
  pasteLabel,
  type ChartClipboard,
  type PasteMode,
} from '@/lib/chartEditor/clipboard';
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  record,
  redo,
  redoLabel,
  seal,
  undo,
  undoLabel,
  type History,
} from '@/lib/chartEditor/history';
import {
  clampSelection,
  clickBar,
  selectAll,
  NO_SELECTION,
  type BarRef,
  type ChartSelection,
  type ClickMods,
} from '@/lib/chartEditor/selection';

/**
 * The host for the chart editor's core.
 *
 * `src/lib/chartEditor` is deliberately four files of pure values — a
 * history, a selection, a clipboard, a set of roadmap operations — none of
 * which knows what a React component is. That is what lets the Studio use
 * them too. This is the part that could not be shared: somebody has to own
 * the state, listen for the keys and decide what an edit is called.
 *
 * The song itself is owned upstream (`StructuredEditorProps.onChange` writes
 * it to the content store), so the history here shadows it rather than
 * replacing it: every edit goes into the history AND up to the owner, and an
 * undo sends the restored value up the same way. The history is seeded once
 * and deliberately not resynced from the prop, because a value arriving back
 * from the store is the value we just sent it.
 */

export interface ChartEditing {
  selection: ChartSelection;
  selectedBars: BarRef[];
  clipboard: ChartClipboard | null;
  /** Click a bar's staff; the modifiers decide what the click means. */
  pickBar: (ref: BarRef, mods: ClickMods) => void;
  clearSelection: () => void;
  /** Write new sections, recording one undo step under this name. */
  apply: (sections: SongSection[], label: string, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** "Undo delete bar", for the button's tooltip. */
  undoLabel: string | null;
  redoLabel: string | null;
  copy: () => void;
  paste: (mode?: PasteMode) => void;
  pasteLabel: string | null;
  /** Bind to the editor's own element so the keys are not global. */
  onKeyDown: (event: React.KeyboardEvent) => void;
}

const now = () => Date.now();

export function useChartEditing(
  song: Song,
  onChange: (sections: SongSection[]) => void,
): ChartEditing {
  const sections = useMemo(() => song.sections ?? [], [song.sections]);
  const chart = useMemo(() => ({ sections }), [sections]);

  const [history, setHistory] = useState<History<SongSection[]>>(() =>
    createHistory(sections),
  );
  const [selection, setSelection] = useState<ChartSelection>(NO_SELECTION);
  const [clipboard, setClipboard] = useState<ChartClipboard | null>(null);

  // The owner's value is the truth for rendering; the history is how we get
  // back to an earlier one. Keep the present in step when an edit arrives
  // from somewhere that is not this hook — the chord popup, a section rename.
  const presentRef = useRef(history.present.value);
  presentRef.current = history.present.value;
  useEffect(() => {
    if (sections !== presentRef.current)
      setHistory((h) => record(h, sections, 'Edit', { at: now() }));
  }, [sections]);

  // A selection outliving the bars it points at is how every later operation
  // ends up reading undefined.
  useEffect(() => {
    setSelection((s) => clampSelection(chart, s));
  }, [chart]);

  const commit = useCallback(
    (next: SongSection[], label: string, coalesceKey?: string) => {
      setHistory((h) => record(h, next, label, { coalesceKey, at: now() }));
      onChange(next);
    },
    [onChange],
  );

  const restore = useCallback(
    (step: (h: History<SongSection[]>) => History<SongSection[]>) => {
      setHistory((h) => {
        const next = step(h);
        if (next === h) return h;
        onChange(current(next));
        return next;
      });
    },
    [onChange],
  );

  const pickBar = useCallback(
    (ref: BarRef, mods: ClickMods) => {
      // Moving the selection ends the run of edits before it: renaming two
      // bars in a row is two undo steps, not one.
      setHistory(seal);
      setSelection((s) => clickBar(chart, s, ref, mods));
    },
    [chart],
  );

  const copy = useCallback(() => {
    const clip = copySelection(sections, selection);
    if (clip) setClipboard(clip);
  }, [sections, selection]);

  const pasteHere = useCallback(
    (mode: PasteMode = 'replace') => {
      if (!clipboard || selection.kind === 'none') return;
      // Paste lands on the first bar of the selection in reading order, not
      // on the anchor: shift-clicking backwards up a phrase still pastes at
      // its start, which is where the eye is.
      const at = selection.refs[0];
      if (!at) return;
      const next = paste(sections, at, clipboard, mode);
      if (next === sections) return;
      commit(
        next,
        mode === 'insert' ? 'Paste and push along' : 'Paste',
        undefined,
      );
    },
    [clipboard, commit, sections, selection],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // A person typing a chord name into a field is not addressing the
      // chart, however hard they press Command.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return;

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (key === 'escape') {
        setSelection(NO_SELECTION);
        return;
      }
      if (!mod) return;

      if (key === 'z') {
        event.preventDefault();
        restore(event.shiftKey ? redo : undo);
      } else if (key === 'y') {
        event.preventDefault();
        restore(redo);
      } else if (key === 'c') {
        event.preventDefault();
        copy();
      } else if (key === 'v') {
        event.preventDefault();
        // Shift pushes the existing bars along instead of writing over them.
        pasteHere(event.shiftKey ? 'insert' : 'replace');
      } else if (key === 'a') {
        event.preventDefault();
        setSelection((s) => selectAll(chart, s));
      }
    },
    [chart, copy, pasteHere, restore],
  );

  return {
    selection,
    selectedBars: selection.kind === 'bars' ? selection.refs : [],
    clipboard,
    pickBar,
    clearSelection: () => setSelection(NO_SELECTION),
    apply: commit,
    undo: () => restore(undo),
    redo: () => restore(redo),
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    undoLabel: undoLabel(history),
    redoLabel: redoLabel(history),
    copy,
    paste: pasteHere,
    pasteLabel: pasteLabel(clipboard),
    onKeyDown,
  };
}
