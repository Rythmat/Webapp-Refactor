import { useAtlasParams } from '@/components/atlas/navigation/useAtlasNavigate';
import { isStoryMode } from './storyParam';

/**
 * Story mode (`?story=1`, owner, 2026-11-16): the student explores as in
 * Explore — the Inspector shows the events, their stories and what they
 * influenced — with their Story docked along the map's foot and Add to Story
 * on every event, place, artist and link. Not a stop's param, so it rides
 * along from stop to stop; leaving for Explore or Tours ends it.
 */
export function useStoryMode(): boolean {
  return useAtlasParams(isStoryMode);
}
