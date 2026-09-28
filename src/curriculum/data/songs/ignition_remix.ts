import type { Song } from '@/curriculum/types/songLibrary';

export const ignition_remix: Song = {
  id: 'ignition_remix',
  title: 'Ignition (Remix)',
  artist: 'R. Kelly',
  year: 2002,
  historicalDescription:
    "R. Kelly releases 'Ignition (Remix)' in 2002, a buoyant, hook-driven R&B anthem that immediately takes on a life of its own beyond its parent album. Its irresistible bounce and sing-along chorus make it one of the most ubiquitous party records of the early 2000s — a rare remix that eclipses the original and becomes the definitive version in pop culture memory.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 134,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MKvqpnB0SxE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/r-kelly.webp',
  popularity: 50,
};
