import type { Song } from '@/curriculum/types/songLibrary';

export const lets_dance: Song = {
  id: 'lets_dance',
  title: 'Let’s Dance',
  artist: 'David Bowie',
  year: 1976,

  historicalDescription:
    "David Bowie releases 'Let's Dance', a sleek pivot from his art rock and glam rock roots toward a polished, funk-inflected sound that dominates radio and earns him his biggest commercial audience yet. The track signals a new era — Bowie the shape-shifter once again reinventing himself, trading the fractured avant-garde for the dancefloor.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 6', chordName: 'G♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bbmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=VbD_kBJc_gI' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/david-bowie.webp',
  popularity: 50,
};
