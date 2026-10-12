/**
 * A student's submitted mind map, for the teacher (Promoter slides). Teacher
 * surface only — identified data, never on the projector.
 */
import { MindMapLegend, MindMapView } from '@/components/mindMap/MindMapView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  MindMapBoard,
  MindMapSubmission,
} from '@/content/graph/mindMapBoard';

export interface MindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  board: MindMapBoard;
  map: MindMapSubmission;
}

export const MindMapDialog = ({
  open,
  onOpenChange,
  studentName,
  board,
  map,
}: MindMapDialogProps) => {
  // Only what is on this board: a stale or stray id is not drawn.
  const known = new Set(board.nodes.map((n) => n.id));
  const added = map.nodeIds.filter((id) => known.has(id));
  const focus = board.nodes.find((n) => n.id === board.focus)?.label ?? '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] rounded-2xl border-white/[0.08] bg-[#151518] text-[#e8e8f0]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
            Mind map
          </span>
          <DialogTitle className="text-xl font-bold">{studentName}</DialogTitle>
          <DialogDescription className="text-sm text-white/55">
            {added.length} connected to {focus} · {map.edgeCount} links
          </DialogDescription>
        </div>
        <MindMapView
          board={board}
          added={added}
          width={576}
          height={360}
          listConnections
          className="mx-auto"
        />
        <MindMapLegend />
      </DialogContent>
    </Dialog>
  );
};
