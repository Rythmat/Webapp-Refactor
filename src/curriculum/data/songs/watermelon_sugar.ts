import type { Song } from '@/curriculum/types/songLibrary';

export const watermelon_sugar: Song = {
  id: 'watermelon_sugar',
  title: 'Watermelon Sugar',
  artist: 'Harry Styles',
  year: 2019,
  historicalDescription:
    "Harry Styles releases 'Watermelon Sugar', a sun-drenched, carefree anthem that signals his full evolution from One Direction teen idol to confident solo artist. With its breezy retro-pop-rock feel, the song captures a hedonistic summer energy and becomes one of his signature tracks — cementing his place as a defining pop voice of his generation.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=E07s5ZYygMg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/harry-styles.webp',
  popularity: 50,
};
