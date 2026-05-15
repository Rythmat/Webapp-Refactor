import type { Song } from '@/curriculum/types/songLibrary';

export const wicked_game: Song = {
  id: 'wicked_game',
  title: 'Wicked Game',
  artist: 'Chris Isaak',
  year: 1990,
  historicalDescription:
    "Chris Isaak's 'Wicked Game' haunts American radio in 1990, its tremolo guitar and aching baritone evoking a timeless heartbreak that feels lifted from another era entirely. Originally buried on his 1989 album, the song explodes into mainstream consciousness after appearing in David Lynch's 'Wild at Heart' — proof that sometimes a film can resurrect a song that the world nearly missed.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jd-qI62gNJM' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
