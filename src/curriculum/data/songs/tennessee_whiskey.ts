import type { Song } from '@/curriculum/types/songLibrary';

export const tennessee_whiskey: Song = {
  id: 'tennessee_whiskey',
  title: 'Tennessee Whiskey',
  artist: 'Chris Stapleton',
  year: 2015,
  historicalDescription:
    "Chris Stapleton releases 'Tennessee Whiskey' on his debut solo album Traveller, transforming a 1981 country standard into a slow-burning soul and gospel tour de force. His raw, powerhouse vocals and the song's swampy groove catch the industry off guard, turning a veteran Nashville songwriter into an overnight star. The performance signals a hunger for authentic, roots-driven country at a time when the genre has drifted toward polished pop.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 50,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4zAThXFOy2c' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/chris-stapleton.webp',
  popularity: 50,
};
