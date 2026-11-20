import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Play,
  Plus,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_CARD,
  ATLAS_FOCUS,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { INSPECTOR_REM } from '@/components/atlas/layout/frameGeometry';
import { useInspectorState } from '@/components/atlas/layout/useInspector';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import { useStoryMode } from './storyMode';
import {
  addStop,
  playStory,
  stopPlaying,
  useStoryPlayback,
  useStoryShelf,
} from './storyStorage';
import { describeTarget, useGoToStoryStop } from './storyTargets';
import {
  isStoryStop,
  storyTargetKey,
  type Story,
  type StoryStop,
} from './storyTypes';

/**
 * The student's Story, docked along the map's foot in Story mode (owner,
 * 2026-11-16: see the events while building, and add them simply): its
 * stops as a filmstrip, the place for what they're on at its end, and Play.
 * Playing, it steps the stops with the student's words over it, while the
 * Inspector shows each stop's details as Explore does.
 */
export function StoryStrip() {
  const story = useStoryInMode();
  const { slot } = useInspectorState();
  if (!story) return null;
  return (
    <div
      className={cn(
        // A container: on a narrow stage the bar folds its words away.
        '@container pointer-events-none absolute bottom-2 right-2 flex flex-col items-center gap-2',
        ATLAS_Z.bars,
      )}
      data-testid="story-strip"
      // Beside the Inspector, whose foot this would cover.
      style={{
        left: slot ? `calc(${INSPECTOR_REM.width}rem + 1rem)` : '0.5rem',
      }}
    >
      <StoryBar story={story} />
    </div>
  );
}

/** The open Story while in Story mode, else null. */
export function useStoryInMode(): Story | null {
  const storyMode = useStoryMode();
  const shelf = useStoryShelf();
  if (!storyMode) return null;
  return shelf.stories.find((s) => s.id === shelf.openId) ?? null;
}

/** The bar alone: a phone sets it in its strip over the sheet. */
export function StoryBar({ story }: { story: Story }) {
  const playback = useStoryPlayback();
  const playing = playback?.storyId === story.id && story.stops.length > 0;
  const step = playing ? Math.min(playback.step, story.stops.length - 1) : -1;
  const current = playing ? story.stops[step] : null;
  return (
    <>
      {current && <Caption stop={current} />}
      <section
        aria-label={`Your story: ${story.title || 'Untitled story'}`}
        className={cn(
          ATLAS_CARD,
          'pointer-events-auto flex max-w-full items-center gap-2 p-2',
        )}
      >
        <StoryName playing={playing} story={story} />
        <Stops step={step} story={story} />
        {playing ? (
          <Player step={step} story={story} />
        ) : (
          <Builder story={story} />
        )}
      </section>
    </>
  );
}

/** The Story's name; it opens the Story to name, note and order. */
function StoryName({ story, playing }: { story: Story; playing: boolean }) {
  const navigate = useAtlasNavigate();
  return (
    <button
      className={cn(
        'flex min-w-0 max-w-[8.5rem] shrink-0 items-center gap-2 rounded-xl py-1 pl-1.5 pr-2 text-left hover:bg-white/[0.06]',
        ATLAS_FOCUS,
      )}
      aria-label={`Edit your story, ${story.title || 'Untitled story'}`}
      title="Edit your story: names, notes and order"
      type="button"
      onClick={() => navigate.setFrame({ panel: 'story' })}
    >
      <BookOpen aria-hidden className="size-4 shrink-0 text-atlas-text-2" />
      <span className="hidden min-w-0 @[34rem]:block">
        <span className="block truncate text-[0.8125rem] font-bold">
          {story.title || 'Untitled story'}
        </span>
        <span className="flex items-center gap-1 text-xs text-atlas-text-2">
          {playing
            ? 'Playing'
            : `${story.stops.length} stop${story.stops.length === 1 ? '' : 's'}`}
          <Pencil aria-hidden className="size-3" />
        </span>
      </span>
    </button>
  );
}

/**
 * The stops as a filmstrip, numbered. A stop goes there (and, playing,
 * steps there); the one the map is on is ringed. The newest scrolls into
 * view as it lands.
 */
function Stops({ story, step }: { story: Story; step: number }) {
  const here = stopKey(useAtlasStop());
  const goTo = useGoToStoryStop();
  const listRef = useRef<HTMLOListElement>(null);
  const count = story.stops.length;
  const last = useRef(count);
  useEffect(() => {
    if (count > last.current) {
      listRef.current?.lastElementChild?.scrollIntoView?.({
        block: 'nearest',
        inline: 'end',
        behavior: 'smooth',
      });
    }
    last.current = count;
  }, [count]);
  if (count === 0) return null;
  return (
    <ol
      ref={listRef}
      aria-label="Stops"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-0.5 py-1 [scrollbar-width:none]"
    >
      {story.stops.map((stop, i) => {
        const on =
          step >= 0 ? i === step : storyTargetKey(stop.target) === here;
        return (
          <li
            key={stop.id}
            className="shrink-0 animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none"
          >
            <StopChip
              index={i}
              on={on}
              stop={stop}
              onOpen={() => {
                if (step >= 0) playStory(story.id, i);
                goTo(stop.target);
              }}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StopChip({
  stop,
  index,
  on,
  onOpen,
}: {
  stop: StoryStop;
  index: number;
  on: boolean;
  onOpen: () => void;
}) {
  const shown = describeTarget(stop.target);
  const title = stop.title || shown.title;
  return (
    <button
      aria-current={on ? 'step' : undefined}
      aria-label={`Stop ${index + 1}: ${title}`}
      className={cn(
        'relative block w-14 rounded-lg ring-offset-2 ring-offset-atlas-panel transition-[box-shadow,opacity]',
        on ? 'ring-2 ring-white' : 'opacity-80 hover:opacity-100',
        ATLAS_FOCUS,
      )}
      title={title}
      type="button"
      onClick={onOpen}
    >
      <StopThumb presentation={shown} />
      <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-black/70 text-xs font-bold leading-none text-white">
        {index + 1}
      </span>
    </button>
  );
}

/**
 * What the student is on, waiting at the strip's end: Add to Story when it
 * can be a stop and isn't one yet; a hint while there's nothing to add.
 * Then Play, and the way out of Story mode.
 */
function Builder({ story }: { story: Story }) {
  const stop = useAtlasStop();
  const navigate = useAtlasNavigate();
  const goTo = useGoToStoryStop();
  const target = isStoryStop(stop) ? stop : null;
  const key = target ? storyTargetKey(target) : null;
  const added =
    !!key && story.stops.some((s) => storyTargetKey(s.target) === key);
  const shown = target ? describeStop(target) : null;
  return (
    <>
      {target && shown && !added ? (
        <button
          className={cn(
            'flex max-w-[12.5rem] shrink-0 items-center gap-2 rounded-xl border border-dashed border-white/30 p-1 pr-3 text-left hover:border-white/60 hover:bg-white/[0.06]',
            ATLAS_FOCUS,
          )}
          aria-label={`Add to Story: ${shown.title}`}
          title={`Add ${shown.title} to your story`}
          type="button"
          onClick={() => addStop(target, shown.title)}
        >
          <span className="w-10 shrink-0 opacity-70">
            <StopThumb presentation={shown} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 whitespace-nowrap text-[0.8125rem] font-bold">
              <Plus aria-hidden className="size-3.5 shrink-0" />
              <span className="@[24rem]:hidden">Add</span>
              <span className="hidden @[24rem]:inline">Add to Story</span>
            </span>
            <span className="hidden truncate text-xs text-atlas-text-2 @[34rem]:block">
              {shown.title}
            </span>
          </span>
        </button>
      ) : (
        story.stops.length === 0 && (
          <p className="hidden max-w-64 shrink-0 px-1 text-xs leading-snug text-atlas-text-2 @[30rem]:block">
            Open an event on the map, then press{' '}
            <b className="text-atlas-text">+ Story</b> to add it here.
          </p>
        )
      )}
      <span aria-hidden className="mx-0.5 h-8 w-px shrink-0 bg-white/10" />
      <AtlasPillButton
        className="shrink-0"
        disabled={story.stops.length === 0}
        size="sm"
        variant="primary"
        onClick={() => {
          const first = story.stops[0];
          if (!first) return;
          playStory(story.id, 0);
          goTo(first.target);
        }}
      >
        <Play aria-hidden className="size-4" />
        Play
      </AtlasPillButton>
      <AtlasIconButton
        aria-label="Leave Story mode"
        className="shrink-0"
        size="sm"
        title="Leave Story mode"
        onClick={() => navigate.setStoryMode(false, { panel: null })}
      >
        <X aria-hidden className="size-4" />
      </AtlasIconButton>
    </>
  );
}

/** Back, on and the end, while the Story plays. */
function Player({ story, step }: { story: Story; step: number }) {
  const goTo = useGoToStoryStop();
  const to = (i: number) => {
    const stop = story.stops[i];
    if (!stop) return;
    playStory(story.id, i);
    goTo(stop.target);
  };
  return (
    <>
      <span aria-hidden className="mx-0.5 h-8 w-px shrink-0 bg-white/10" />
      <div className="flex shrink-0 items-center gap-1">
        <AtlasIconButton
          aria-label="Previous stop"
          disabled={step === 0}
          size="sm"
          onClick={() => to(step - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </AtlasIconButton>
        <span
          aria-live="polite"
          className="min-w-[3.25rem] text-center text-xs tabular-nums text-atlas-text-2"
        >
          {step + 1} of {story.stops.length}
        </span>
        <AtlasIconButton
          aria-label="Next stop"
          disabled={step === story.stops.length - 1}
          size="sm"
          onClick={() => to(step + 1)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </AtlasIconButton>
      </div>
      <AtlasPillButton className="shrink-0" size="sm" onClick={stopPlaying}>
        <Square aria-hidden className="size-3.5" />
        End
      </AtlasPillButton>
    </>
  );
}

/** The stop's own words over the strip while the Story plays. */
function Caption({ stop }: { stop: StoryStop }) {
  const title = stop.title || describeTarget(stop.target).title;
  return (
    <div
      key={stop.id}
      className={cn(
        ATLAS_CARD,
        'pointer-events-auto max-w-xl px-4 py-3 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none',
      )}
    >
      <p className="text-sm font-bold leading-snug">{title}</p>
      {stop.note && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-atlas-text/80">
          {stop.note}
        </p>
      )}
    </div>
  );
}
