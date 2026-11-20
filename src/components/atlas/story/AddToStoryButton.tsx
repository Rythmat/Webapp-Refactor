import { Check, Plus } from 'lucide-react';
import {
  ATLAS_FOCUS,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { cn } from '@/lib/utils';
import { useStoryMode } from './storyMode';
import { addStop, useStoryShelf } from './storyStorage';
import { storyTargetKey, type StoryTarget } from './storyTypes';

/** Whether the open Story already has this stop. */
export function useInOpenStory(target: StoryTarget | null): boolean {
  const shelf = useStoryShelf();
  if (!target) return false;
  const story = shelf.stories.find((s) => s.id === shelf.openId);
  const key = storyTargetKey(target);
  return !!story?.stops.some((stop) => storyTargetKey(stop.target) === key);
}

/**
 * Add to Story, wherever a thing is shown in Story mode (owner, 2026-11-16):
 * an event's tile, a place's or an artist's card, a link on the Connections
 * card. `pill` reads "+ Story", then "In story"; `icon` is a plus, then a
 * tick. Outside Story mode, nothing.
 */
export function AddToStoryButton({
  target,
  title,
  variant = 'icon',
}: {
  target: StoryTarget | null;
  /** The stop's name: the button's and the new stop's. */
  title: string;
  variant?: 'icon' | 'pill';
}) {
  const storyMode = useStoryMode();
  const added = useInOpenStory(target);
  if (!storyMode || !target) return null;
  const label = added ? `${title} is in your story` : `Add ${title} to Story`;
  if (variant === 'pill') {
    return (
      <button
        aria-label={label}
        aria-pressed={added}
        className={cn(
          'flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-bold transition-colors',
          added
            ? 'bg-white/10 text-atlas-text-2'
            : 'bg-white text-atlas-page hover:bg-white/90',
          ATLAS_FOCUS,
        )}
        title={added ? 'In your story' : 'Add to your story'}
        type="button"
        onClick={() => {
          if (!added) addStop(target, title);
        }}
      >
        {added ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Plus aria-hidden className="size-3.5" />
        )}
        {added ? 'In story' : 'Story'}
      </button>
    );
  }
  return (
    <AtlasIconButton
      aria-label={label}
      disabled={added}
      size="xs"
      title={added ? 'In your story' : 'Add to your story'}
      onClick={() => addStop(target, title)}
    >
      {added ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Plus aria-hidden className="size-3.5" />
      )}
    </AtlasIconButton>
  );
}
