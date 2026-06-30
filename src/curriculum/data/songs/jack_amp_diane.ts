import type { Song } from '@/curriculum/types/songLibrary';

export const jack_amp_diane: Song = {
  id: 'jack_amp_diane',
  title: 'Jack &amp; Diane',
  artist: 'John Cougar Mellencamp',
  year: undefined,

  historicalDescription:
    "John Cougar Mellencamp releases 'Jack & Diane', a bittersweet snapshot of small-town American teenage life that resonates across the heartland and beyond. Its simple, indelible chorus — 'Oh yeah, life goes on, long after the thrill of living is gone' — captures a generation's quiet disillusionment with the American dream, cementing Mellencamp as the poet laureate of middle America.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
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
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/4', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 1 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6gy16cbFZbI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/john-cougar-mellencamp.webp',
  popularity: 50,
};
