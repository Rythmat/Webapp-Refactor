import { X } from 'lucide-react';
import { memo, useEffect } from 'react';
import { cn } from '@/components/utilities';
import { InsightContent } from '@/daw/components/Library/InsightContent';
import { DevProfiler } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { ChatBody } from './panels/ChatBody';
import { LessonsBody } from './panels/LessonsBody';
import { LibraryBody } from './panels/LibraryBody';
import { PeopleBody } from './panels/PeopleBody';
import { railPanel } from './railPanels';

// ── The Inspector panel (B4a) ──────────────────────────────────────────────
//
// What the side rail's open icon shows: a header with the panel's name and
// a close, and the panel's body, which only mounts while it shows. The
// column itself (its width, its resizer, open or shut per view) is the
// shell's. An analysis of a selection (the piano roll's Analyze) brings
// Insight forward, as the old panel's tab did.

export const InspectorPanel = memo(function InspectorPanel() {
  const panel = useStore((s) => s.inspectorPanel);
  const close = useStore((s) => s.toggleLibrary);
  const { title } = railPanel(panel);

  const selectionAnalysis = useStore((s) => s.selectionAnalysis);
  useEffect(() => {
    if (selectionAnalysis) useStore.getState().showInspectorPanel('insight');
  }, [selectionAnalysis]);

  return (
    <div
      data-testid="inspector-panel"
      data-panel={panel}
      className="flex min-h-0 flex-col overflow-hidden rounded-[var(--daw-radius-lg)] bg-daw-surface-1 duration-daw-fast animate-in fade-in-0 motion-reduce:animate-none"
      style={{ width: 'var(--daw-insp-w, 300px)' }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-daw-hairline pl-3 pr-1.5">
        <h2 className={cn(TYPE_CLASS.title, 'flex-1 truncate text-daw-text')}>
          {title}
        </h2>
        <IconButton
          label={`Close ${title}`}
          icon={<X />}
          size="sm"
          tooltipSide="left"
          data-testid="inspector-close"
          onClick={close}
        />
      </div>
      <div
        key={panel}
        className="flex min-h-0 flex-1 flex-col"
        data-ds={panel === 'insight' ? 'legacy' : 'v2'}
      >
        <DevProfiler id={`Inspector:${panel}`}>
          <Body panel={panel} />
        </DevProfiler>
      </div>
    </div>
  );
});

function Body({ panel }: { panel: string }) {
  switch (panel) {
    case 'library':
      return <LibraryBody />;
    case 'lessons':
      return <LessonsBody />;
    case 'people':
      return <PeopleBody />;
    case 'chat':
      return <ChatBody />;
    default:
      return (
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <InsightContent />
        </div>
      );
  }
}
