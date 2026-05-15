import type { Song } from '@/curriculum/types/songLibrary';

export const on_on: Song = {
  id: 'on_on',
  title: 'On & On',
  artist: 'Erykah Badu',
  year: 1997,
  historicalDescription:
    "Erykah Badu releases 'On & On' as the lead single from her debut album 'Baduizm', announcing the arrival of a singular new voice in R&B. The track's spare, hypnotic groove and Badu's spiritual, stream-of-consciousness lyrics help define the neo-soul movement — a soulful, jazz-inflected alternative to the polished sheen dominating mainstream R&B in the late 1990s.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 81,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['R&B'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 9,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=VUlamYFdCH0' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
