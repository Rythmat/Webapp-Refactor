import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_dreams: Song = {
  id: 'sweet_dreams',
  title: 'Sweet Dreams',
  artist: 'Eurythmics',
  year: undefined,

  historicalDescription:
    "Annie Lennox and Dave Stewart release 'Sweet Dreams (Are Made of This)', a hypnotic synth-driven anthem that becomes a global phenomenon. Lennox's androgynous image and icy, commanding vocal cut through the MTV era with striking force, making the Eurythmics one of the defining acts of 1980s new wave. The song's relentless synthesizer riff lodges itself permanently in pop culture.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=qeMFqkcPYcg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/eurythmics.webp',
  popularity: 50,
};
