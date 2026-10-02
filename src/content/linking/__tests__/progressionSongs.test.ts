import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { applySuggestion } from '../../suggestions/apply';
import { planProgressionSongs } from '../progressionSongs';

/**
 * Reading a source sheet's song ('Dreams- Fleetwood Mac'): a wrong link is
 * worse than a missing one, so each way a sheet writes a song is pinned.
 */

const songs = [
  { id: 'love_on_top', title: 'Love On Top', artist: 'Beyoncé' },
  {
    id: 'cant_stop_the_feeling',
    title: 'Can’t Stop The Feeling',
    artist: 'Justin Timberlake',
  },
  { id: 'on_on', title: 'On & On', artist: 'Erykah Badu' },
  { id: 'juice', title: 'Juice', artist: 'Lizzo' },
  {
    id: 'saturday_in_the_park',
    title: 'Saturday In The Park',
    artist: 'Chicago',
  },
  { id: 'blackbird', title: 'Blackbird', artist: 'The Beatles' },
  {
    id: 'aint_no_mountain_high_enough',
    title: 'Ain’t No Mountain High Enough',
    artist: 'Marvin Gaye',
  },
  {
    id: 'hallelujah_i_love_her_so',
    title: 'Hallelujah I Love Her So',
    artist: 'Ray Charles',
  },
  { id: 'as', title: 'As', artist: 'Stevie Wonder' },
  { id: 'stay_with_me', title: 'Stay With Me', artist: 'Sam Smith' },
  { id: 'changes', title: 'Changes', artist: 'David Bowie' },
  { id: 'dreams', title: 'Dreams', artist: 'Fleetwood Mac' },
  {
    id: 'nothing_compares_2_u',
    title: 'Nothing Compares 2 U',
    artist: 'Sinéad O’Connor',
    composer: 'Prince',
  },
] as Song[];

const offered = (text: string, field: 'song' | 'artist' = 'song') =>
  planProgressionSongs({
    songs,
    progressions: [{ id: 1, [field]: text }],
  }).planned.map((p) => [p.suggestion.value, p.suggestion.tier]);

describe('the song a progression’s sheet names', () => {
  it('is sure when the title and the artist both agree', () => {
    expect(offered('Love on Top (Beyonce)', 'artist')).toEqual([
      ['love_on_top', 'sure'],
    ]);
    expect(offered('Dreams- Fleetwood Mac')).toEqual([['dreams', 'sure']]);
    // No separator at all.
    expect(offered('Juice Lizzo')).toEqual([['juice', 'sure']]);
    // A section named between the title and the artist.
    expect(offered('Dreams (bridge)- Fleetwood Mac')).toEqual([
      ['dreams', 'sure'],
    ]);
    // Without "The", misspelt by two letters, as initials, or the writer.
    expect(offered('Blackbird (Beatles)')).toEqual([['blackbird', 'sure']]);
    expect(offered('On and On (Erykah Badhu)')).toEqual([['on_on', 'sure']]);
    expect(offered("Can't Stop the Feeling- JT", 'artist')).toEqual([
      ['cant_stop_the_feeling', 'sure'],
    ]);
    expect(offered('Nothing Compares 2 U (Prince)')).toEqual([
      ['nothing_compares_2_u', 'sure'],
    ]);
  });

  it('reads a sheet that names several songs one at a time', () => {
    expect(
      offered('Saturday in the Park (Chicago), Blackbird (Beatles)'),
    ).toEqual([
      ['saturday_in_the_park', 'sure'],
      ['blackbird', 'sure'],
    ]);
  });

  it('is only likely for a title with no artist, or one the sheet shortens', () => {
    expect(offered('Dreams')).toEqual([['dreams', 'likely']]);
    expect(offered("Ain't No Mountain")).toEqual([
      ['aint_no_mountain_high_enough', 'likely'],
    ]);
    // The one the library's own comment warns about: offered, for a person
    // to reject.
    expect(offered('Hallelujah')).toEqual([
      ['hallelujah_i_love_her_so', 'likely'],
    ]);
  });

  it('offers nothing another artist’s song, or a title that only starts the sheet’s', () => {
    expect(offered('As it Was- Harry Styles')).toEqual([]);
    expect(offered('Stay- Rihanna')).toEqual([]);
    const plan = planProgressionSongs({
      songs,
      progressions: [{ id: 528, song: 'Changes (Tupac)' }],
    });
    expect(plan.planned).toEqual([]);
    expect(plan.report.disagree).toEqual([
      {
        progression: 528,
        text: 'Changes (Tupac)',
        songId: 'changes',
        named: 'tupac',
      },
    ]);
  });

  it('adds to the list, never offers a song already linked, and counts what it read', () => {
    const plan = planProgressionSongs({
      songs,
      progressions: [
        { id: 1, song: 'Dreams- Fleetwood Mac', songIds: ['dreams'] },
        { id: 2, song: 'Juice Lizzo', songIds: ['dreams'] },
        { id: 3, song: 'Fly Me To The Moon' },
        { id: 4, song: '' },
      ],
    });
    expect(plan.planned).toHaveLength(1);
    const [juice] = plan.planned;
    expect(juice.suggestion).toMatchObject({
      target: { kind: 'chord_progression', slug: '2' },
      path: 'songIds[]',
      op: 'add',
      value: 'juice',
      display: 'Used in "Juice" (Lizzo)',
      sources: [{ provider: 'app', label: 'chord_progression 2 song' }],
    });
    const written = applySuggestion(
      { id: 2, song: 'Juice Lizzo', songIds: ['dreams'] },
      juice.suggestion,
    );
    expect(written.ok && written.body.songIds).toEqual(['dreams', 'juice']);
    expect(plan.report).toMatchObject({
      withText: 3,
      named: 3,
      linked: 2,
      sure: 1,
      likely: 0,
      unmatched: [{ progression: 3, text: 'Fly Me To The Moon' }],
    });
  });
});
