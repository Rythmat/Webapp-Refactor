import type { Song } from '@/curriculum/types/songLibrary';

export const wagon_wheel: Song = {
  id: 'wagon_wheel',
  title: 'Wagon Wheel',
  artist: 'Darius Rucker/Old Crow Medicine Show',
  year: undefined,

  historicalDescription:
    "Old Crow Medicine Show builds a full song around an unfinished Bob Dylan sketch, turning a fragment from the 'Knockin' on Heaven's Door' sessions into a rousing bluegrass anthem about drifting south. Darius Rucker's 2013 country cover brings the song to massive mainstream audiences, making it one of the rare tracks to top both the country and bluegrass charts — a testament to its timeless, rambling spirit.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 148,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1gX1EP6mG-E' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/darius-rucker-old-crow-medicine-show.webp',
  popularity: 50,
};
