import {
  ArrowDown,
  ArrowUp,
  Calendar,
  LayoutList,
  MapPin,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { useId, useState } from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_EYEBROW,
  ATLAS_FOCUS,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import {
  createStory,
  deleteStory,
  editStop,
  moveStop,
  openStory,
  playStory,
  removeStop,
  renameStory,
  setStoryDescription,
  useStoryShelf,
} from '@/components/atlas/story/storyStorage';
import {
  coverEvent,
  describeTarget,
  useGoToStoryStop,
} from '@/components/atlas/story/storyTargets';
import type { Story, StoryStop } from '@/components/atlas/story/storyTypes';
import type { HistoricalEvent } from '@/components/atlas/types';
import { cn } from '@/lib/utils';
import {
  CloseButton,
  Meta,
  TourTile,
  coverOf,
  stopCount,
  yearSpan,
} from './tourParts';

/**
 * The Story panel, in the Inspector (owner, 2026-11-16): the student's own
 * tours of the Globe. With none open, their Stories as tiles; with one open,
 * its name, what it's about, and its stops to name, note and order. Adding
 * happens where things are shown (Add to Story on an event's tile, a place's
 * or an artist's card, a Connections row), and the Story itself rides along
 * the map's foot (story/StoryStrip.tsx), which also plays it.
 */
export default function StoryPanel({ onClose }: { onClose: () => void }) {
  const shelf = useStoryShelf();
  const story = shelf.stories.find((s) => s.id === shelf.openId);
  if (!story) return <StoryList stories={shelf.stories} onClose={onClose} />;
  return <StoryEditor story={story} onClose={onClose} />;
}

/** The events of a Story's stops, each once, in order. */
const storyEvents = (stops: readonly StoryStop[]): HistoricalEvent[] => {
  const seen = new Set<string>();
  return stops
    .map((stop) => coverEvent(stop.target))
    .filter((e): e is HistoricalEvent => {
      if (!e || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
};

const FIELD = cn(
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-3 hover:border-white/20 focus:border-white/30 focus:outline-none',
  ATLAS_FOCUS,
);

/* ── The list ────────────────────────────────────────────────────────────── */

function StoryList({
  stories,
  onClose,
}: {
  stories: readonly Story[];
  onClose: () => void;
}) {
  return (
    <AtlasPanel
      actions={<CloseButton onClose={onClose} />}
      as="div"
      header={
        <div className="mt-3">
          <AtlasPillButton
            size="sm"
            variant="primary"
            onClick={() => createStory()}
          >
            <Plus aria-hidden className="size-4" />
            New story
          </AtlasPillButton>
        </div>
      }
      subtitle="Your own tours of the Globe"
      title="Story"
    >
      <AtlasPanelBody className="px-4 pb-3">
        {stories.length === 0 ? (
          <div className="mt-4 text-sm leading-relaxed text-atlas-text-2">
            <p>
              Make a tour of your own. Explore the map or the Connections ring,
              and press <b className="text-atlas-text">Add to Story</b> on
              anything you find: an event, a place, an artist, or a link between
              two places.
            </p>
            <p className="mt-2">
              Then give each stop your own words, put them in order, and play it
              like a Music Atlas tour.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {stories.map((story) => {
              const events = storyEvents(story.stops);
              return (
                <li key={story.id}>
                  <TourTile
                    row={{
                      key: story.id,
                      title: story.title,
                      detail: story.description || 'No description yet',
                      cover: coverOf(events),
                      meta: (
                        <>
                          <Meta icon={MapPin}>
                            {stopCount(story.stops.length)}
                          </Meta>
                          {events.length > 0 && (
                            <Meta icon={Calendar}>{yearSpan(events)}</Meta>
                          )}
                        </>
                      ),
                      open: () => openStory(story.id),
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-atlas-text-3">
          Stories are saved on this device.
        </p>
      </AtlasPanelBody>
    </AtlasPanel>
  );
}

/* ── Building a Story ────────────────────────────────────────────────────── */

/** Back to every Story. */
function AllStories() {
  return (
    <AtlasIconButton
      aria-label="All stories"
      size="sm"
      title="All stories"
      onClick={() => openStory(null)}
    >
      <LayoutList aria-hidden className="size-4" />
    </AtlasIconButton>
  );
}

function StoryEditor({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  const goTo = useGoToStoryStop();
  const nameId = useId();
  const aboutId = useId();
  const play = () => {
    const first = story.stops[0];
    if (!first) return;
    playStory(story.id, 0);
    goTo(first.target);
  };
  return (
    <AtlasPanel
      actions={
        <>
          <AllStories />
          <CloseButton onClose={onClose} />
        </>
      }
      as="div"
      eyebrow="Story"
      header={
        <p className="mt-2 text-sm leading-relaxed text-atlas-text-2">
          Add stops with <b className="text-atlas-text">+ Story</b> on any
          event, place or artist, or the + on a Connections row. They line up in
          the bar under the map.
        </p>
      }
      subtitle={stopCount(story.stops.length)}
      title={story.title || 'Untitled story'}
    >
      <AtlasPanelBody className="px-4 pb-4">
        <div className="mt-3 space-y-2">
          <label className="block" htmlFor={nameId}>
            <span className={ATLAS_EYEBROW}>Name</span>
          </label>
          <input
            className={FIELD}
            id={nameId}
            placeholder="Name your story"
            type="text"
            value={story.title}
            onChange={(e) => renameStory(story.id, e.target.value)}
          />
          <label className="block pt-1" htmlFor={aboutId}>
            <span className={ATLAS_EYEBROW}>About</span>
          </label>
          <textarea
            className={cn(FIELD, 'resize-y')}
            id={aboutId}
            placeholder="What is this story about?"
            rows={2}
            value={story.description}
            onChange={(e) => setStoryDescription(story.id, e.target.value)}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <h4 className={ATLAS_EYEBROW}>Stops</h4>
          <AtlasPillButton
            disabled={story.stops.length === 0}
            size="sm"
            onClick={play}
          >
            <Play aria-hidden className="size-4" />
            Play story
          </AtlasPillButton>
        </div>
        {story.stops.length === 0 ? (
          <p className="mt-2 text-sm text-atlas-text-2">
            No stops yet. Add the first one above.
          </p>
        ) : (
          <ol aria-label="Stops" className="mt-2 space-y-2">
            {story.stops.map((stop, i) => (
              <li key={stop.id}>
                <StopRow
                  index={i}
                  last={i === story.stops.length - 1}
                  stop={stop}
                  storyId={story.id}
                  onShow={() => goTo(stop.target)}
                />
              </li>
            ))}
          </ol>
        )}

        <DeleteStory story={story} />
      </AtlasPanelBody>
    </AtlasPanel>
  );
}

/** A stop as the student builds it: its title and note, its place in line. */
function StopRow({
  storyId,
  stop,
  index,
  last,
  onShow,
}: {
  storyId: string;
  stop: StoryStop;
  index: number;
  last: boolean;
  onShow: () => void;
}) {
  const shown = describeTarget(stop.target);
  const n = index + 1;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
      <div className="flex items-start gap-2">
        <button
          aria-label={`Show stop ${n} on the map`}
          className={cn('w-16 shrink-0 rounded-lg', ATLAS_FOCUS)}
          title="Show it on the map"
          type="button"
          onClick={onShow}
        >
          <StopThumb presentation={shown} />
        </button>
        <div className="min-w-0 flex-1">
          <input
            aria-label={`Stop ${n} title`}
            className="w-full rounded-md bg-transparent px-1 text-sm font-bold text-atlas-text placeholder:text-atlas-text-3 hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
            placeholder={shown.title}
            type="text"
            value={stop.title}
            onChange={(e) =>
              editStop(storyId, stop.id, { title: e.target.value })
            }
          />
          <p className="truncate px-1 text-xs text-atlas-text-2">
            {n}. {shown.subtitle || shown.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <AtlasIconButton
            aria-label={`Move stop ${n} up`}
            disabled={index === 0}
            size="xs"
            onClick={() => moveStop(storyId, stop.id, -1)}
          >
            <ArrowUp aria-hidden className="size-3.5" />
          </AtlasIconButton>
          <AtlasIconButton
            aria-label={`Move stop ${n} down`}
            disabled={last}
            size="xs"
            onClick={() => moveStop(storyId, stop.id, 1)}
          >
            <ArrowDown aria-hidden className="size-3.5" />
          </AtlasIconButton>
          <AtlasIconButton
            aria-label={`Remove stop ${n}`}
            size="xs"
            onClick={() => removeStop(storyId, stop.id)}
          >
            <Trash2 aria-hidden className="size-3.5" />
          </AtlasIconButton>
        </div>
      </div>
      <textarea
        aria-label={`Stop ${n} note`}
        className={cn(FIELD, 'mt-2 resize-y')}
        placeholder="Your note: what happens here, and why it matters"
        rows={2}
        value={stop.note}
        onChange={(e) => editStop(storyId, stop.id, { note: e.target.value })}
      />
    </div>
  );
}

/** Deleting a Story, asked once in place (no browser dialog). */
function DeleteStory({ story }: { story: Story }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <div className="mt-6">
        <AtlasPillButton size="sm" onClick={() => setAsking(true)}>
          <Trash2 aria-hidden className="size-4" />
          Delete story
        </AtlasPillButton>
      </div>
    );
  }
  return (
    <div
      className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
      role="group"
      aria-label="Delete this story?"
    >
      <p className="text-sm text-atlas-text">
        Delete “{story.title || 'Untitled story'}” and its{' '}
        {stopCount(story.stops.length)}? This can’t be undone.
      </p>
      <div className="mt-2 flex gap-2">
        <AtlasPillButton
          size="sm"
          variant="primary"
          onClick={() => deleteStory(story.id)}
        >
          Delete
        </AtlasPillButton>
        <AtlasPillButton size="sm" onClick={() => setAsking(false)}>
          Keep it
        </AtlasPillButton>
      </div>
    </div>
  );
}
