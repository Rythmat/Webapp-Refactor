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
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 5 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
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
      id: 'verse_2',
      label: 'Verse 2',
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
      id: 'verse_3',
      label: 'Verse 3',
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
      id: 'verse_4',
      label: 'Verse 4',
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
      id: 'verse_5',
      label: 'Verse 5',
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
      id: 'verse_6',
      label: 'Verse 6',
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
      id: 'verse_7',
      label: 'Verse 7',
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
      id: 'outro',
      label: 'Outro',
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
