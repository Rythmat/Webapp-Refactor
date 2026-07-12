import { ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  useAppDispatch,
  useAppState,
} from '@/components/atlas/context/AppContext';
import {
  getUpstreamChain,
  getDownstreamChain,
  getEventCountryColor,
  getContrastColor,
} from '@/components/atlas/data';
import type { UpstreamChainNode } from '@/components/atlas/data/eventConnections';
import type { HistoricalEvent } from '@/components/atlas/types';

// Recursive influence tree (used for both upstream and downstream)
function InfluenceTree({
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
    <div className={depth > 0 ? 'ml-3 mt-1 border-l border-white/10 pl-2' : ''}>
      {nodes.map((node) => {
        const hex = getEventCountryColor(node.event);
        const text = getContrastColor(hex, 0.85);
        return (
          <div key={node.event.id} className="mb-1">
            <button
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium hover:brightness-110"
              style={{ backgroundColor: hex, color: text }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(node.event);
              }}
            >
              <Icon className="size-3" />
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
}

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
  const dispatch = useAppDispatch();
  const { visibleArcDirections } = useAppState();
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  // Inline (affectsGlobe): the open state mirrors the globe's arc visibility, so
  // starting the video (which opens both arcs) also expands these sections.
  // Modal (affectsGlobe=false): purely local, since the globe is hidden.
  const open = affectsGlobe ? visibleArcDirections.has(direction) : localOpen;
  return (
    <div>
      <button
        className="mb-1 flex items-center gap-1 text-xs font-medium text-white/60 transition-colors hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          // Toggle the globe arcs (and, via GlobeController, the zoom-out +
          // auto-rotate). In the modal, just toggle the local section.
          if (affectsGlobe)
            dispatch({ type: 'TOGGLE_ARC_DIRECTION', payload: direction });
          else setLocalOpen((o) => !o);
        }}
      >
        <ChevronDown
          className={`size-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        {label} ({count})
      </button>
      {open && children}
    </div>
  );
}

/**
 * "Influenced by" (upstream) and "Influenced" (downstream) collapsible influence
 * chains for an event. Renders nothing when the event has no connections.
 * Shared by the region DetailsCard list and the search-results pinned event.
 */
export function EventInfluence({
  event,
  onNavigate,
  defaultOpen = false,
  affectsGlobe = true,
  className = 'mt-3 space-y-2 border-t border-white/10 pt-2',
}: {
  event: HistoricalEvent;
  onNavigate: (event: HistoricalEvent) => void;
  /** Render the chains expanded regardless of the globe arc state. */
  defaultOpen?: boolean;
  /** Whether toggling a section drives the globe arcs / zoom / rotation. */
  affectsGlobe?: boolean;
  className?: string;
}) {
  const upstreamChain = getUpstreamChain(event.id);
  const downstreamChain = getDownstreamChain(event.id);
  if (upstreamChain.length === 0 && downstreamChain.length === 0) return null;

  return (
    <div className={className}>
      {upstreamChain.length > 0 && (
        <CollapsibleInfluence
          count={countNodes(upstreamChain)}
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
          count={countNodes(downstreamChain)}
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
