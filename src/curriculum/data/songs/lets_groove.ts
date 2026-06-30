import type { Song } from '@/curriculum/types/songLibrary';

export const lets_groove: Song = {
  id: 'lets_groove',
  title: 'Let’s Groove',
  artist: 'Earth, Wind & Fire',
  year: undefined,

  historicalDescription:
    "Earth, Wind & Fire release 'Let's Groove', a sleek fusion of funk, soul, and synthesizer-driven disco that captures the sound of a genre in transition. As the early 1980s pull pop music toward electronic production, Maurice White and the band ride the wave without losing their rhythmic soul. The song becomes one of their signature hits, cementing their legacy as architects of sophisticated Black pop.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'rnb'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Lrle0x_DHBM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/earth-wind-and-fire.webp',
  popularity: 50,
};
