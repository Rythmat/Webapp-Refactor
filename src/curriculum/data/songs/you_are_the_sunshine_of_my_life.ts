import type { Song } from '@/curriculum/types/songLibrary';

export const you_are_the_sunshine_of_my_life: Song = {
  id: 'you_are_the_sunshine_of_my_life',
  title: 'You Are The Sunshine Of My Life',
  artist: 'Stevie Wonder',
  year: 1973,
  historicalDescription:
    "Stevie Wonder releases 'You Are The Sunshine Of My Life' from his landmark album Talking Book, a radiant soul ballad that earns him his first Grammy Award for Best Male Pop Vocal Performance. The song signals Wonder's artistic liberation after renegotiating full creative control from Motown — marking the beginning of his classic period, one of the most celebrated runs in pop music history.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['soul'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7(♯5)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 7', chordName: 'F♯7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '1 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'A♭min7b5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'D♯7alt', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 1 },
            { degree: '6 7', chordName: 'D♯7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭2 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj/7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '♭2 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=sp6hzycBsTI' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
