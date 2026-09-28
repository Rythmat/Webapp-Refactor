import type { Song } from '@/curriculum/types/songLibrary';

export const the_gambler: Song = {
  id: 'the_gambler',
  title: 'The Gambler',
  artist: 'Kenny Rogers',
  year: 1978,
  historicalDescription:
    "Kenny Rogers releases 'The Gambler' in 1978, a story-song built around a chance meeting with a card shark on a late-night train. The gambling metaphors — 'know when to hold 'em, know when to fold 'em' — transcend country radio and enter the American vernacular as universal life advice. The song wins Rogers a Grammy and cements his crossover appeal as one of country pop's defining voices.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♭2 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '♭2 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=7hx4gdlfamo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kenny-rogers.webp',
  popularity: 50,
};
