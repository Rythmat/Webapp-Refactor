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

const PANEL =
  'absolute inset-x-2 bottom-2 z-[1000] flex max-h-[60%] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#151518]/95 text-[#e8e8f0] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:max-h-[calc(100%-7rem)] sm:w-[360px]';
const EYEBROW = 'text-xs font-bold uppercase tracking-[0.14em] text-white/45';
const PRIMARY =
  'inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#101012] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151518] disabled:opacity-40';
const OUTLINE =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 text-sm text-[#e8e8f0] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40';

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
      <aside className={PANEL} aria-label="Mind map">
        <div className="flex flex-col gap-2 p-4">
          <span className={EYEBROW}>Mind map</span>
          <p className="text-sm text-white/55">
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
    <aside className={PANEL} aria-label="Mind map">
      <header className="flex flex-col gap-1 border-b border-white/[0.08] p-4">
        <span className={EYEBROW}>Mind map</span>
        <h2 className="text-xl font-bold leading-tight">{focus?.label}</h2>
        {handoff?.question.en && (
          <p className="text-sm text-white/55">{handoff.question.en}</p>
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
          <span className="text-xs text-white/55">
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
            <span className={EYEBROW}>Looking at</span>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] p-3">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                {addable && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: KIND_COLOR[addable.kind] }}
                    aria-hidden
                  />
                )}
                <span className={addable ? 'truncate' : 'text-white/55'}>
                  {hereStatus.text}
                </span>
              </span>
              {addable && (
                <button
                  type="button"
                  className={PRIMARY}
                  onClick={() => update([...added, addable.id])}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
          </section>
        )}

        {!submitted && leads.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className={EYEBROW}>Leads to explore</span>
            <ul className="flex flex-col">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => fly(lead)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: KIND_COLOR[lead.kind] }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{lead.label}</span>
                      <span className="truncate text-xs text-white/45">
                        {leadReason(board, onMap, lead)}
                      </span>
                    </span>
                    <MapPin className="ml-auto h-4 w-4 shrink-0 text-white/45" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {added.length > 0 && !submitted && (
          <section className="flex flex-col gap-2">
            <span className={EYEBROW}>On your map</span>
            <ul className="flex flex-wrap gap-1.5">
              {added.map((id) => {
                const node = board.nodes.find((n) => n.id === id);
                if (!node) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        // Removing a node also removes what only it joined.
                        update(
                          pruned(
                            board,
                            added.filter((a) => a !== id),
                          ),
                        )
                      }
                      className={OUTLINE}
                      aria-label={`Remove ${node.label}`}
                    >
                      {node.label}
                      <X className="h-3.5 w-3.5 text-white/45" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <footer className="border-t border-white/[0.08] p-4">
        {submitted ? (
          <p className="inline-flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Sent to your teacher.
          </p>
        ) : (
          <button
            type="button"
            className={`${PRIMARY} w-full`}
            disabled={added.length === 0 || !launchParams}
            onClick={() => {
              reportResult({
                kind: 'mindMap',
                map: submissionFor(board, added),
              });
              setSubmitted(true);
            }}
          >
            <Send className="h-4 w-4" />
            {added.length >= board.goal ? 'Submit map' : 'Submit map so far'}
          </button>
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
