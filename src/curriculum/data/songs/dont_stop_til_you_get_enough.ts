import type { Song } from '@/curriculum/types/songLibrary';

export const dont_stop_til_you_get_enough: Song = {
  id: 'dont_stop_til_you_get_enough',
  title: 'Don’t Stop ‘Til You Get Enough',
  artist: 'Michael Jackson',
  year: 1979,
  historicalDescription:
    "Michael Jackson releases 'Don't Stop 'Til You Get Enough' in 1979, his first solo single on Epic Records and the lead track from Off the Wall. Written and produced by Jackson himself, it announces his arrival as a fully formed adult artist — no longer the child star of the Jackson 5, but a commanding creative force blending disco, funk, and pop into something undeniably his own.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Bmin7/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Bmin7/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=yURRmWtbTbo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
