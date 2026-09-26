/**
 * The embed↔link contract.
 *
 * Requirement 2 of the brief is that every piece of content is BOTH embedded
 * and linked. The teacher's 76 real decks contain zero OLE relationships —
 * every "video" is a static thumbnail carrying a hyperlink, because PowerPoint
 * forced embed and link onto the same object. We can do better: render the real
 * thing AND keep the canonical link.
 *
 * `hrefForEmbed` is the invariant that delivers it: it is TOTAL over
 * `EmbedDescriptor` and never returns null, so an element that has an embed can
 * never lack a link. An element with `embed: null` is a link card. There is no
 * third state.
 *
 * P2 introduces this because the v1 migration has to produce elements whose
 * `href` is REQUIRED; inventing a placeholder would make the invariant a
 * fiction on day one. P3 extends this file with the link POLICY (validation,
 * `parseEmbeddableUrl`, the opening rules); the mapping below is deliberately
 * only the mapping.
 */
import type { ContentHref, EmbedDescriptor } from './types';

/**
 * The canonical location of whatever `embed` renders. Exhaustive with no
 * `default`: a new embed type is a compile error here, which is exactly the
 * point — it cannot ship without a link.
 */
export const hrefForEmbed = (embed: EmbedDescriptor): ContentHref => {
  switch (embed.type) {
    case 'youtube':
      // The external watch URL, start time preserved.
      return {
        kind: 'external',
        url: `https://www.youtube.com/watch?v=${embed.videoId}${
          embed.startSec ? `&t=${embed.startSec}` : ''
        }`,
        host: 'youtube.com',
      };
    case 'artistImage':
      return { kind: 'atlas', ref: `song:${embed.songId}:lesson` };
    case 'chordChart':
      return { kind: 'atlas', ref: `song:${embed.songId}:chart` };
    case 'globePathway':
      return { kind: 'atlas', ref: `globe:pathway:${embed.pathwayId}` };
    case 'globePreview':
      // No specific target — the Globe itself is the canonical location.
      return { kind: 'atlas', ref: 'globe:home' };
    case 'scaleKeyboard':
      return { kind: 'atlas', ref: `learn:${embed.mode}:${embed.key}` };
    case 'image':
      // An uploaded image's canonical home is the asset itself (P4 assets).
      return { kind: 'atlas', ref: `asset:${embed.assetId}` };
    case 'atlasCard':
      return { kind: 'atlas', ref: embed.ref };
  }
};
