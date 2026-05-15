import type { Song } from '@/curriculum/types/songLibrary';

export const waterfalls: Song = {
  id: 'waterfalls',
  title: 'Waterfalls',
  artist: 'TLC',
  year: 1995,
  historicalDescription:
    "TLC releases 'Waterfalls' in 1995, a slow-burning cautionary tale addressing the AIDS crisis, drug violence, and the pursuit of dangerous dreams. The song becomes one of the defining cultural moments of the decade, spending seven weeks at number one and cementing TLC as voices of a generation — not just entertainers, but storytellers.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip_hop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [] },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8WEtxJ4-sh4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
