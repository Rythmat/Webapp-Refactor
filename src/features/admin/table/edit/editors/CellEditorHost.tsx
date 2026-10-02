import { ChoiceEditor } from './ChoiceEditor';
import { ChordsCellEditor } from './ChordsCellEditor';
import { InlineEditor } from './InlineEditor';
import type { CellEditorProps } from './types';

/**
 * The editor a cell opens, by its column's editor (`editorFor`): a choice
 * list, a progression's chords as chips, or a text box for everything
 * typed.
 *
 * The Table's third chunk: the grid loads it on the first edit (and
 * prefetches it once the grid has focus and the browser is idle), so the
 * grid never carries the editors, and they never carry the pickers or the
 * Link… dialog (gridChunk.test.ts). The pickers, the relation editors and
 * the born popover join it in a later phase; until then their cells open
 * the row at the field.
 */
export const CellEditorHost = (props: CellEditorProps) => {
  const { editor } = props;
  if (editor.type === 'choice')
    return <ChoiceEditor {...props} editor={editor} />;
  if (editor.type === 'chords')
    return <ChordsCellEditor {...props} editor={editor} />;
  return <InlineEditor {...props} editor={editor} />;
};
