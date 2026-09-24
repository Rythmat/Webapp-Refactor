import type { Song } from '@/curriculum/types/songLibrary';

export const a_long_walk: Song = {
  id: 'a_long_walk',
  title: 'A Long Walk',
  artist: 'Jill Scott',
  year: 2000,
  historicalDescription:
    "Jill Scott releases 'A Long Walk' from her debut album, announcing the arrival of a major new voice in neo-soul. Languid, intimate, and rooted in the rhythms of everyday Black life in Philadelphia, the song captures the feeling of falling in love slowly and quietly — a deliberate counterpoint to the era's flashier R&B. It helps define a movement alongside Erykah Badu and D'Angelo that brings depth and artistry back to soul music.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 76,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip hop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5SK48Bk_RnI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jill-scott.webp',
  popularity: 50,
};
