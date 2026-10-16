import { Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  history: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
}

/**
 * Undo and redo for the console's editors: a curved arrow back and one
 * forward, outlined and labelled so they read as buttons even with nothing
 * to undo yet. ⌘Z and ⌘⇧Z do the same.
 */
export const UndoRedo = ({ history }: Props) => (
  <div className="flex items-center gap-1">
    <Button
      size="sm"
      variant="outline"
      onClick={history.undo}
      disabled={!history.canUndo}
      title="Undo (⌘Z)"
      className="disabled:opacity-40"
    >
      <Undo2 /> Undo
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={history.redo}
      disabled={!history.canRedo}
      title="Redo (⌘⇧Z)"
      className="disabled:opacity-40"
    >
      <Redo2 /> Redo
    </Button>
  </div>
);
