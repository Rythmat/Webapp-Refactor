import type { Song } from '@/curriculum/types/songLibrary';

export const cake_by_the_ocean: Song = {
  id: 'cake_by_the_ocean',
  title: 'Cake By The Ocean',
  artist: 'DNCE',
  year: 2015,
  historicalDescription:
    "DNCE, the band fronted by Joe Jonas, releases 'Cake By The Ocean' as their debut single in 2015. The euphoric pop-rock track becomes a sleeper hit, building momentum over months until it dominates radio and playlists worldwide — signaling a broader shift toward funk-inflected, carefree pop that defines mid-2010s mainstream radio.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=vWaRiD5ym74' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
