import { ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { memo, useId, useMemo, useState } from 'react';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives';
import {
  getUpstreamChain,
  getDownstreamChain,
  getEventCountryColor,
  getContrastColor,
} from '@/components/atlas/data';
import type { UpstreamChainNode } from '@/components/atlas/data/eventConnections';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { HistoricalEvent } from '@/components/atlas/types';
import { contentGeneration } from '@/content/contentStore';

// Recursive influence tree (used for both upstream and downstream)
const InfluenceTree = memo(function InfluenceTree({
  nodes,
  onNavigate,
  depth = 0,
  direction = 'upstream',
}: {
  nodes: UpstreamChainNode[];
  onNavigate: (event: HistoricalEvent) => void;
  depth?: number;
  direction?: 'upstream' | 'downstream';
}) {
  if (nodes.length === 0) return null;
  const Icon = direction === 'upstream' ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className={
        depth > 0 ? 'ml-3 mt-1 border-l border-atlas-panel-border pl-2' : ''
      }
    >
      {nodes.map((node) => {
        const hex = getEventCountryColor(node.event);
        const text = getContrastColor(hex, 0.85);
        return (
          <div key={node.event.id} className="mb-1">
            <button
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-left text-xs font-medium hover:brightness-110 ${ATLAS_FOCUS}`}
              // The event's country colour, from the data.
              style={{ backgroundColor: hex, color: text }}
              type="button"
              onClick={() => onNavigate(node.event)}
            >
              <Icon aria-hidden className="size-3 shrink-0" />
              <span>{node.event.title}</span>
              <span className="ml-0.5" style={{ color: text, opacity: 0.75 }}>
                {node.event.year}
              </span>
            </button>
            {node.upstream.length > 0 && (
              <InfluenceTree
                depth={depth + 1}
                direction={direction}
                nodes={node.upstream}
                onNavigate={onNavigate}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

function countNodes(nodes: UpstreamChainNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countNodes(node.upstream);
  }
  return n;
}

// Collapsible section for influence trees — defaults to collapsed
function CollapsibleInfluence({
  label,
  count,
  direction,
  children,
  defaultOpen = false,
  affectsGlobe = true,
}: {
  label: string;
  count: number;
  direction: 'upstream' | 'downstream';
  children: React.ReactNode;
  defaultOpen?: boolean;
  affectsGlobe?: boolean;
}) {
  const dispatch = useAtlasDispatch();
  // Selects one boolean, so toggling the other direction leaves this alone.
  const arcsShown = useAtlasSelector((s) =>
    s.visibleArcDirections.has(direction),
  );
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  // Inline (affectsGlobe): the open state mirrors the globe's arc visibility, so
  // starting the video (which opens both arcs) also expands these sections.
  // Modal (affectsGlobe=false): purely local, since the globe is hidden.
  const open = affectsGlobe ? arcsShown : localOpen;
  const treeId = useId();
  return (
    <div>
      <button
        aria-controls={open ? treeId : undefined}
        aria-expanded={open}
        className={`mb-1 flex items-center gap-1 rounded-full text-xs font-bold text-atlas-text-2 transition-colors hover:text-atlas-text ${ATLAS_FOCUS}`}
        type="button"
        onClick={() => {
          // Toggle the globe arcs. In the modal, just toggle the local
          // section.
          if (affectsGlobe)
            dispatch({ type: 'TOGGLE_ARC_DIRECTION', payload: direction });
          else setLocalOpen((o) => !o);
        }}
      >
        <ChevronDown
          aria-hidden
          className={`size-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        {label} ({count})
      </button>
      {open && <div id={treeId}>{children}</div>}
    </div>
  );
}

/**
 * "Influenced by" (upstream) and "Influenced" (downstream) collapsible influence
 * chains for an event. Renders nothing when the event has no connections.
 * Shared by the region DetailsCard list and the search-results pinned event.
 */
function EventInfluenceInner({
  event,
  onNavigate,
  defaultOpen = false,
  affectsGlobe = true,
  className = 'mt-3 space-y-2 border-t border-atlas-panel-border pt-2',
}: {
  event: HistoricalEvent;
  onNavigate: (event: HistoricalEvent) => void;
  /** Render the chains expanded regardless of the globe arc state. */
  defaultOpen?: boolean;
  /** Whether toggling a section drives the globe's influence arcs. */
  affectsGlobe?: boolean;
  className?: string;
}) {
  // Both walks cross the whole influence graph — a hub event's downstream tree
  // runs to ~495 nodes — so they run once per event. contentGeneration is in
  // the deps because MUSIC_HISTORY is filled in place after the CDN bundle
  // lands (see contentStore.ts), which the event id alone would not reflect.
  const { upstreamChain, downstreamChain, upstreamCount, downstreamCount } =
    useMemo(() => {
      const up = getUpstreamChain(event.id);
      const down = getDownstreamChain(event.id);
      return {
        upstreamChain: up,
        downstreamChain: down,
        upstreamCount: countNodes(up),
        downstreamCount: countNodes(down),
      };
    }, [event.id, contentGeneration]);

  if (upstreamChain.length === 0 && downstreamChain.length === 0) return null;

  return (
    <div className={className}>
      {upstreamChain.length > 0 && (
        <CollapsibleInfluence
          count={upstreamCount}
          label="Influenced by"
          direction="upstream"
          defaultOpen={defaultOpen}
          affectsGlobe={affectsGlobe}
        >
          <InfluenceTree nodes={upstreamChain} onNavigate={onNavigate} />
        </CollapsibleInfluence>
      )}
      {downstreamChain.length > 0 && (
        <CollapsibleInfluence
          count={downstreamCount}
          label="Influenced"
          direction="downstream"
          defaultOpen={defaultOpen}
          affectsGlobe={affectsGlobe}
        >
          <InfluenceTree
            direction="downstream"
            nodes={downstreamChain}
            onNavigate={onNavigate}
          />
        </CollapsibleInfluence>
      )}
    </div>
  );
}

export const EventInfluence = memo(EventInfluenceInner);
