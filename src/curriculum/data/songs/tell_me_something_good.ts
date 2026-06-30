import type { Song } from '@/curriculum/types/songLibrary';

export const tell_me_something_good: Song = {
  id: 'tell_me_something_good',
  title: 'Tell Me Something Good',
  artist: 'Chaka Khan',
  year: undefined,

  historicalDescription:
    "Stevie Wonder writes 'Tell Me Something Good' for Rufus, and Chaka Khan's raw, commanding vocal performance turns it into a funk landmark. The track announces Khan as one of the most electrifying voices in R&B and helps elevate Rufus from a backing band into a force in their own right. It wins the Grammy for Best R&B Song in 1975.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 2,
      bars: [
        { chords: [] },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 1 },
            { degree: '♭7 7', chordName: 'G♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 3,
      bars: [
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'D dim7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '♭6 dim7', chordName: 'E dim7', beat: 3, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          restBars: 2,
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 1 },
            { degree: '♭7 7', chordName: 'G♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 3,
      bars: [
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'D dim7', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '♭6 dim7', chordName: 'E dim7', beat: 3, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'G♭7', beat: 1, duration: 1 },
            { degree: '7 7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          restBars: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BLTpyw9pUoE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/chaka-khan.webp',
  popularity: 50,
};
