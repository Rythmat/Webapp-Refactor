import type { Song } from '@/curriculum/types/songLibrary';

export const smells_like_teen_spirit: Song = {
  id: 'smells_like_teen_spirit',
  title: 'Smells Like Teen Spirit',
  artist: 'Nirvana',
  year: 1991,
  historicalDescription:
    "Nirvana releases 'Smells Like Teen Spirit' in 1991, and the raw, distorted anthem tears through mainstream radio like a wrecking ball. Kurt Cobain's quiet-loud dynamics and disaffected howl give voice to a generation of alienated youth, dragging grunge out of Seattle's underground and into living rooms worldwide — permanently redrawing the map of rock music.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Dave Grohl', role: 'songwriter', artistGlobeId: 'dave-grohl' },
    { name: 'Kurt Cobain', role: 'songwriter', artistGlobeId: 'kurt-cobain' },
    {
      name: 'Krist Novoselic',
      role: 'songwriter',
      artistGlobeId: 'krist-novoselic',
    },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hTWKbfoikeg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/nirvana.webp',
  popularity: 50,
};
