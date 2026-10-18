import { MousePointer2, Pencil, Scissors } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/daw/store';
import type { ToolType } from '@/daw/store/uiSlice';
import { Segmented } from '@/daw/ui/Segmented';
import { RULER_PX } from '../tracklist/rowLayout';

// ── The editing tools (milestones 2.7 and 2.13) ────────────────────────────
//
// Pointer (V), Draw (B) and Cut (C), in the header's left cell beside the
// ruler, over the track list: Create's toolbar row folded away (decision
// 16) and its controls went where they belong. The keys are the timeline's
// (keymaps.ts); these are the same choice, visible. Their tips open to the
// right, past the group, where the column is empty: above they covered
// + Add track, below the chord lane's key.

const TOOLS: readonly { value: ToolType; label: string; icon: JSX.Element }[] =
  [
    { value: 'cursor', label: 'Pointer (V)', icon: <MousePointer2 /> },
    { value: 'pencil', label: 'Draw clips (B)', icon: <Pencil /> },
    { value: 'scissors', label: 'Cut clips (C)', icon: <Scissors /> },
  ];

export const TimelineTools = memo(function TimelineTools() {
  const tool = useStore((s) => s.activeTool);
  return (
    <div
      data-testid="timeline-tools"
      className="flex items-center border-b border-daw-hairline px-2"
      style={{ height: RULER_PX }}
    >
      <Segmented
        label="Editing tool"
        iconOnly
        tooltipSide="right"
        options={TOOLS}
        // 'layout' (key 4) has no button; the pointer stands for it.
        value={tool === 'layout' ? 'cursor' : tool}
        onValueChange={(next) => useStore.getState().setActiveTool(next)}
        className="shrink-0"
      />
    </div>
  );
});
