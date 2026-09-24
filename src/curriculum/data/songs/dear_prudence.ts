import type { Song } from '@/curriculum/types/songLibrary';

export const dear_prudence: Song = {
  id: 'dear_prudence',
  title: 'Dear Prudence',
  artist: 'The Beatles',
  year: 1968,
  historicalDescription:
    "The Beatles record 'Dear Prudence' during their landmark sessions in Rishikesh, India, where John Lennon writes the song for Mia Farrow's sister Prudence, who has retreated into intense meditation. The fingerpicking guitar pattern — taught to Lennon by Donovan during their transcendental meditation retreat — gives the song its hypnotic, cascading feel, capturing the band's immersion in Eastern spirituality at a turning point in their career.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [], restBars: 5 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '5 maj/1', chordName: 'A/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'D/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'G min7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'G/B', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=wQA59IkCF5I' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
