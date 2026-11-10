/**
 * One name for any link into the app (owner, 2026-11-10): its module, a title
 * a teacher recognises, and a picture when there is one. The lesson picker,
 * the slide's app cards and the session report all read it, so a link is
 * called the same thing everywhere instead of showing its raw ref.
 */
import { getGameByRoute } from '@/components/Games/arcadeGames';
import type { Song } from '@/curriculum/types/songLibrary';
import { getTutorialEntry } from '@/daw/components/Tutorial/tutorialCatalog';
import type { LaunchTile } from '../types';

export interface RefDescription {
  module: LaunchTile['module'];
  title: string;
  /** A real picture: a song's artist. Otherwise the card draws a pattern. */
  imageUrl?: string;
}

export interface DescribeRefDeps {
  getSong?: (id: string) => Song | undefined | null;
}

/** "new-orleans" → "New Orleans". */
const titleCase = (slug: string): string =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const MODULE_OF: Record<string, LaunchTile['module']> = {
  song: 'learn',
  learn: 'learn',
  curriculum: 'learn',
  studio: 'studio',
  globe: 'globe',
  arcade: 'arcade',
};

export const describeRef = (
  ref: string,
  deps: DescribeRefDeps = {},
): RefDescription => {
  const parts = ref.split(':');
  const [ns, a, b] = parts;
  const module = MODULE_OF[ns] ?? 'learn';
  const rest = parts.slice(2).join(':');

  switch (ns) {
    case 'song': {
      const song = a ? deps.getSong?.(a) : undefined;
      const name = song ? `“${song.title}”` : titleCase(a ?? 'Song');
      return {
        module,
        title: b === 'chart' ? `${name} chord chart` : `${name} lesson`,
        ...(song?.artistImageRef && song.artistImageSource !== 'none'
          ? { imageUrl: song.artistImageRef }
          : {}),
      };
    }
    case 'learn':
      return {
        module,
        title: a && b ? `${titleCase(a)} in ${b.toUpperCase()}` : 'Theory',
      };
    case 'curriculum': {
      const level = b?.replace(/^L/i, '');
      return {
        module,
        title: `${titleCase((a ?? '').toLowerCase())}${level ? ` — Level ${level}` : ''}`,
      };
    }
    case 'studio': {
      if (a === 'tutorial' && rest)
        return {
          module,
          title: getTutorialEntry(rest)?.title ?? titleCase(rest),
        };
      if (a === 'template' && rest)
        return { module, title: `${titleCase(rest)} template` };
      if (a === 'song' && rest) return { module, title: titleCase(rest) };
      if (a === 'library') return { module, title: 'Your Studio projects' };
      return { module, title: 'The Studio' };
    }
    case 'globe': {
      if (a === 'mindmap') return { module, title: 'Mind map on the Globe' };
      if (a === 'tour' && rest) {
        const [kind, ...id] = rest.split('-');
        const name = titleCase(id.join('-'));
        return {
          module,
          title: kind === 'artist' ? `${name} on the Globe` : `${name} tour`,
        };
      }
      if ((a === 'city' || a === 'region' || a === 'pathway') && rest)
        return { module, title: titleCase(rest) };
      if (a === 'era' && rest) return { module, title: `The ${rest} era` };
      if (a === 'event') return { module, title: 'An event on the Globe' };
      return { module, title: 'The Globe' };
    }
    case 'arcade':
      return {
        module,
        title: (a && getGameByRoute(a)?.title) ?? titleCase(a ?? 'Arcade'),
      };
    default:
      return { module, title: ref };
  }
};
