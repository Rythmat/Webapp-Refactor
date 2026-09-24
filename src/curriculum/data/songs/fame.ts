import type { Song } from '@/curriculum/types/songLibrary';

export const fame: Song = {
  id: 'fame',
  title: 'Fame',
  artist: 'David Bowie',
  year: 1975,
  historicalDescription:
    "David Bowie co-writes 'Fame' with John Lennon and Carlos Alomar, a funk-driven meditation on the hollow seductions of celebrity. Built on Alomar's choppy guitar riff, it becomes Bowie's first US number-one single — a cynical anthem arriving at the peak of his own stardom. The song signals his pivot toward American funk and soul, setting the stage for the 'plastic soul' era of Young Americans.",
  key: 'F mixolydian',
  keyRoot: 65,
  mode: 'mixolydian',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ypgq0qdgVZA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
