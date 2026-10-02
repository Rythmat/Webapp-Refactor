import type { Song } from '@/curriculum/types/songLibrary';

export const ophelia: Song = {
  id: 'ophelia',
  title: 'Ophelia',
  artist: 'The Band',
  year: 1975,
  historicalDescription:
    "The Band revisits 'Ophelia', originally recorded in 1975, as part of their enduring catalog that blends Americana, rock, and R&B into something timeless. The song's rollicking energy captures the rootsy spirit that made The Band a touchstone for generations of musicians seeking authenticity over spectacle.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 92,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Robbie Robertson',
      role: 'songwriter',
      artistGlobeId: 'robbie-robertson',
    },
    {
      name: 'The Band',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-band',
    },
  ],
  releases: [
    { releaseId: 'the-band-northern-lights-southern-cross', track: 3 },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'C7', beat: 1, duration: 1 },
            { degree: '2 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '3 dom7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 dom7', chordName: 'C7', beat: 2, duration: 1 },
            { degree: '2 dom7', chordName: 'D7', beat: 3, duration: 1 },
            { degree: '3 dom7', chordName: 'E7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=xe7y7ByOrwQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-band.webp',
  popularity: 50,
};
