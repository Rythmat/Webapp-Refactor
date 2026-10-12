/**
 * The Promoter's mind map, inside the Globe.
 *
 * Opened from a Cortex lesson's Group Project slide (`globe:mindmap`), which
 * hands this tab the board: the lesson's focus and the artists, cities, events
 * and songs around it in the Atlas graph (`msp/mindMapHandoff`). The student
 * explores the Globe; whatever they are looking at that connects to their map
 * can be added, and the map draws the connection the way Cortex labels it.
 * Submitting sends the map to the teacher through the classroom's module
 * result path (`useMspModuleCompletion`).
 *
 * Loaded on demand (`atlas.tsx`, `?mindmap=1`), so the Globe's own chunk does
 * not grow.
 */
import { CheckCircle2, MapPin, Plus, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_HEADING,
  ATLAS_ROW,
  ATLAS_SURFACE,
  AtlasEyebrow,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasZone } from '@/components/atlas/layout/zoneContext';
import {
  decodePlace,
  type AtlasStop,
} from '@/components/atlas/navigation/atlasStop';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  MindMapLegend,
  MindMapView,
  KIND_COLOR,
} from '@/components/mindMap/MindMapView';
import {
  boardNodeForStop,
  edgeLabelFrom,
  joinsMap,
  leadsFor,
  submissionFor,
  type GlobeStopRef,
  type MindMapBoard,
  type MindMapNode,
} from '@/content/graph/mindMapBoard';
import type { EntityId } from '@/content/graph/types';
import { readMindMapHandoff } from '@/features/classroom/msp/mindMapHandoff';
import { useMspModuleCompletion } from '@/features/classroom/msp/useMspModuleCompletion';
import { cn } from '@/lib/utils';

/**
 * The zone places the panel (layout/AtlasZones.tsx): the right column on
 * desktop, under the map controls; on a phone, the bottom sheet it shares
 * with the left panel, which is then the surface.
 */
const PANEL = {
  column: cn(
    ATLAS_SURFACE,
    'flex min-h-0 w-[360px] max-w-full flex-col overflow-hidden',
  ),
  sheet: 'flex min-h-0 flex-1 flex-col overflow-hidden text-atlas-text',
} as const;

/** Leads shown at once: enough to choose from, not a list to copy down. */
const MAX_LEADS = 6;
/** The map's width inside the panel's padding. */
const MAP_WIDTH = 328;
const MAP_HEIGHT = 260;

const progressKey = (interactionId: string) =>
  `ma:mindmap:added:v1:${interactionId}`;

const readProgress = (interactionId: string): EntityId[] => {
  try {
    const raw = window.sessionStorage.getItem(progressKey(interactionId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is EntityId => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeProgress = (interactionId: string, added: EntityId[]) => {
  try {
    window.sessionStorage.setItem(
      progressKey(interactionId),
      JSON.stringify(added),
    );
  } catch {
    // The map still works; a reload starts it again.
  }
};

/** What the Globe is showing, as the board names things. */
const stopRef = (stop: AtlasStop): GlobeStopRef | null => {
  switch (stop.kind) {
    case 'event':
      return { kind: 'event', eventId: stop.eventId };
    case 'artist':
      return { kind: 'artist', artist: stop.artist };
    case 'place':
      return stop.place.type === 'city'
        ? { kind: 'city', cityId: stop.place.id }
        : null;
    default:
      return null;
  }
};

/** The Globe stop for a board node. */
const atlasStopFor = (node: MindMapNode): AtlasStop | null => {
  const { stop } = node;
  if ('event' in stop) return { kind: 'event', eventId: stop.event };
  if ('artist' in stop) return { kind: 'artist', artist: stop.artist };
  const place = decodePlace(stop.place);
  return place ? { kind: 'place', place } : null;
};

/** How a lead joins the map: "born in Motor City". */
const leadReason = (
  board: MindMapBoard,
  onMap: ReadonlySet<EntityId>,
  lead: MindMapNode,
): string | null => {
  for (const edge of board.edges) {
    const other =
      edge.from === lead.id ? edge.to : edge.to === lead.id ? edge.from : null;
    if (!other || !onMap.has(other)) continue;
    const name = board.nodes.find((n) => n.id === other)?.label ?? '';
    return `${edgeLabelFrom(edge, lead.id)} ${name}`;
  }
  return null;
};

export default function MindMapPanel() {
  const panel = PANEL[useAtlasZone().kind];
  const { launch, reportResult } = useMspModuleCompletion();
  const [launchParams] = useState(() => launch());
  const interactionId = launchParams?.interactionId ?? null;
  const handoff = useMemo(
    () => (interactionId ? readMindMapHandoff(interactionId) : null),
    [interactionId],
  );
  const board = handoff?.board ?? null;

  const stop = useAtlasStop();
  const navigate = useAtlasNavigate();
  const [added, setAdded] = useState<EntityId[]>(() =>
    interactionId ? readProgress(interactionId) : [],
  );
  const [submitted, setSubmitted] = useState(false);

  const fly = useCallback(
    (node: MindMapNode) => {
      const target = atlasStopFor(node);
      if (target) navigate.go(target);
    },
    [navigate],
  );

  // Arrive at the focus, unless the Globe was opened somewhere already.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || !board) return;
    arrived.current = true;
    const focus = board.nodes.find((n) => n.id === board.focus);
    if (focus && stop.kind === 'home') fly(focus);
  }, [board, fly, stop.kind]);

  const update = (next: EntityId[]) => {
    setAdded(next);
    if (interactionId) writeProgress(interactionId, next);
  };

  if (!board) {
    return (
      <aside className={panel} aria-label="Mind map">
        <div className="flex flex-col gap-2 p-4">
          <AtlasEyebrow>Mind map</AtlasEyebrow>
          <p className="text-sm text-atlas-text-2">
            Open the mind map from your class&apos;s slide to start building it.
          </p>
        </div>
      </aside>
    );
  }

  const onMap = new Set<EntityId>([board.focus, ...added]);
  const addedSet = new Set(added);
  const focus = board.nodes.find((n) => n.id === board.focus);
  const ref = stopRef(stop);
  const here = ref ? boardNodeForStop(board, ref) : undefined;
  const leads = leadsFor(board, addedSet).slice(0, MAX_LEADS);
  const reached = Math.min(added.length, board.goal);

  const hereStatus = (() => {
    if (!ref) return { text: 'Pick an artist, city or event on the Globe.' };
    if (!here)
      return { text: `Not on ${focus?.label ?? 'the'} map. Keep exploring.` };
    if (here.id === board.focus)
      return { text: 'This is the centre of your map.' };
    if (addedSet.has(here.id)) return { text: 'Already on your map.' };
    if (!joinsMap(board, addedSet, here.id))
      return {
        text: 'Connected further out. Add what links it to your map first.',
      };
    return { text: here.label, addable: here };
  })();
  const addable = hereStatus.addable;

  return (
    <aside className={panel} aria-label="Mind map">
      <header className="flex flex-col gap-1 border-b border-atlas-panel-border p-4">
        <AtlasEyebrow>Mind map</AtlasEyebrow>
        <h2
          className={cn(ATLAS_HEADING, ATLAS_FOCUS, 'rounded-sm')}
          data-atlas-panel-heading
          tabIndex={-1}
        >
          {focus?.label}
        </h2>
        {handoff?.question.en && (
          <p className="text-sm text-atlas-text-2">{handoff.question.en}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={board.goal}
            aria-valuenow={reached}
            aria-label="Connections found"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150"
              style={{ width: `${(reached / Math.max(1, board.goal)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-atlas-text-2">
            {added.length} of {board.goal}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <MindMapView
          board={board}
          added={added}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          highlight={here?.id ?? null}
          edgeLabels="around"
          onSelect={fly}
          className="mx-auto"
        />
        <MindMapLegend />

        {!submitted && (
          <section className="flex flex-col gap-2" aria-live="polite">
            <AtlasEyebrow>Looking at</AtlasEyebrow>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-atlas-panel-border p-3">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                {addable && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: KIND_COLOR[addable.kind] }}
                    aria-hidden
                  />
                )}
                <span className={addable ? 'truncate' : 'text-atlas-text-2'}>
                  {hereStatus.text}
                </span>
              </span>
              {addable && (
                <AtlasPillButton
                  variant="primary"
                  onClick={() => update([...added, addable.id])}
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Add
                </AtlasPillButton>
              )}
            </div>
          </section>
        )}

        {!submitted && leads.length > 0 && (
          <section className="flex flex-col gap-2">
            <AtlasEyebrow>Leads to explore</AtlasEyebrow>
            <ul className="flex flex-col">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => fly(lead)}
                    className={`flex w-full items-center gap-2 px-2 py-2 text-left ${ATLAS_ROW}`}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: KIND_COLOR[lead.kind] }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{lead.label}</span>
                      <span className="truncate text-xs text-atlas-text-2">
                        {leadReason(board, onMap, lead)}
                      </span>
                    </span>
                    <MapPin
                      aria-hidden
                      className="ml-auto h-4 w-4 shrink-0 text-atlas-text-3"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {added.length > 0 && !submitted && (
          <section className="flex flex-col gap-2">
            <AtlasEyebrow>On your map</AtlasEyebrow>
            <ul className="flex flex-wrap gap-1.5">
              {added.map((id) => {
                const node = board.nodes.find((n) => n.id === id);
                if (!node) return null;
                return (
                  <li key={id}>
                    <AtlasPillButton
                      onClick={() =>
                        // Removing a node also removes what only it joined.
                        update(
                          pruned(
                            board,
                            added.filter((a) => a !== id),
                          ),
                        )
                      }
                      aria-label={`Remove ${node.label}`}
                    >
                      {node.label}
                      <X
                        aria-hidden
                        className="h-3.5 w-3.5 text-atlas-text-2"
                      />
                    </AtlasPillButton>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <footer className="border-t border-atlas-panel-border p-4">
        {submitted ? (
          <p className="inline-flex items-center gap-2 text-sm">
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            Sent to your teacher.
          </p>
        ) : (
          <AtlasPillButton
            className="w-full"
            variant="primary"
            disabled={added.length === 0 || !launchParams}
            onClick={() => {
              reportResult({
                kind: 'mindMap',
                map: submissionFor(board, added),
              });
              setSubmitted(true);
            }}
          >
            <Send aria-hidden className="h-4 w-4" />
            {added.length >= board.goal ? 'Submit map' : 'Submit map so far'}
          </AtlasPillButton>
        )}
      </footer>
    </aside>
  );
}

/**
 * The added nodes that still join the map once one is taken away, in order:
 * a node reached only through the removed one goes with it.
 */
const pruned = (board: MindMapBoard, added: EntityId[]): EntityId[] => {
  const kept: EntityId[] = [];
  let changed = true;
  let remaining = [...added];
  while (changed) {
    changed = false;
    for (const id of remaining)
      if (joinsMap(board, new Set(kept), id)) {
        kept.push(id);
        changed = true;
      }
    remaining = remaining.filter((id) => !kept.includes(id));
  }
  return added.filter((id) => kept.includes(id));
};
