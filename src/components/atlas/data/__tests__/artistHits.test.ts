/**
 * Every artist card on a genre Overview has a Globe icon that opens the
 * artist's globe card, where a featured hit plays. So every Overview artist
 * needs one — this is the test that catches a new card shipping without it.
 */
import { describe, expect, it } from 'vitest';
import { GENRE_PROFILES } from '@/curriculum/data/genreProfiles';
import { ARTIST_HITS, getArtistHit } from '../artistHits';

/**
 * Overview artists still without a featured hit, and why. Each needs Aaron's
 * call before it gets one (planning ledger T-036).
 */
const PENDING = new Set([
  // No clean official upload of any of his hits exists on YouTube.
  'Southside (808 Mafia)',
  // The official "Insane in the Brain" video may not be the edited audio:
  // Apple lists it as cleaned, its captions don't agree. Needs a listen.
  'Cypress Hill',
]);

const overviewArtists = Object.values(GENRE_PROFILES).flatMap((profile) =>
  profile.primaryArtists.map((artist) => ({
    genre: profile.id,
    card: artist.name,
    globe: artist.globeArtist ?? artist.name,
  })),
);

describe('featured hits for Overview artists', () => {
  it('has Overview artists to check', () => {
    expect(overviewArtists.length).toBeGreaterThan(40);
  });

  it('gives every Overview artist a featured hit on the Globe', () => {
    const missing = overviewArtists
      .filter(({ card }) => !PENDING.has(card))
      .filter(({ globe }) => !getArtistHit(globe))
      .map(({ genre, card }) => `${genre}: ${card}`);
    expect(missing).toEqual([]);
  });

  it('uses well-formed YouTube ids, each once', () => {
    const ids = Object.values(ARTIST_HITS).map((hit) => hit.videoId);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
