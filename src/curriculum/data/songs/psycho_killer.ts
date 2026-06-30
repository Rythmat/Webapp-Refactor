import type { Song } from '@/curriculum/types/songLibrary';

export const psycho_killer: Song = {
  id: 'psycho_killer',
  title: 'Psycho Killer',
  artist: 'Talking Heads',
  year: 1977,
  historicalDescription:
    "Talking Heads release 'Psycho Killer' as part of their debut album, a chilling character study delivered in David Byrne's anxious, fractured vocal style with a bilingual English-French lyric that sets the band apart from their CBGB peers. The song captures the art-punk energy of late-1970s New York, where Talking Heads forge a cerebral, skittish alternative to the raw aggression of punk. It becomes one of the most distinctive and enduring songs to emerge from that downtown Manhattan scene.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=CJ54eImz88w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
