import type { Song } from '@/curriculum/types/songLibrary';

export const jack_diane: Song = {
  id: 'jack_diane',
  title: 'Jack & Diane',
  artist: 'John Cougar Mellencamp',
  year: undefined,

  historicalDescription:
    "John Cougar Mellencamp releases 'Jack & Diane', a sun-drenched snapshot of American teenage life in the heartland. The song's irresistible chorus and plainspoken storytelling strike a nerve across the country, becoming an anthem for ordinary youth growing up far from the coasts. It cements Mellencamp as the voice of working-class Middle America.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '5 maj/1', chordName: 'E/A', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '5 maj/1', chordName: 'E/A', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [{ chords: [], restBars: 19 }],
    },
    {
      id: 'section_f',
      label: 'Section F',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '5 maj/1', chordName: 'E/A', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=h04CH9YZcpI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/john-cougar-mellencamp.webp',
  popularity: 50,
};
