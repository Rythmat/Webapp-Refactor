/**
 * Story mode's URL param (`?story=1`, story/storyMode.ts). Apart, so the
 * navigation can write it without importing the hooks that read it.
 */
export const STORY_PARAM = 'story';

export const isStoryMode = (params: URLSearchParams) =>
  params.get(STORY_PARAM) === '1';
