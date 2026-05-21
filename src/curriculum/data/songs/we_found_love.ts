import type { Song } from '@/curriculum/types/songLibrary';

export const we_found_love: Song = {
  id: 'we_found_love',
  title: 'We Found Love',
  artist: 'Rihanna',
  year: 2011,
  historicalDescription:
    "Rihanna and producer Calvin Harris release 'We Found Love', a euphoric dance-pop anthem that becomes one of the best-selling singles of all time. Its pulsing four-on-the-floor beat and Rihanna's soaring vocal hook capture the peak of EDM's crossover into mainstream pop, cementing the era when festival culture and Top 40 radio fully collide.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      repeatCount: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tg00YEETFzg' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
