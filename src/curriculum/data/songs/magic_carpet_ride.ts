import type { Song } from '@/curriculum/types/songLibrary';

export const magic_carpet_ride: Song = {
  id: 'magic_carpet_ride',
  title: 'Magic Carpet Ride',
  artist: 'Steppenwolf',
  year: 1968,
  historicalDescription:
    "Steppenwolf releases 'Magic Carpet Ride' in 1968, a hypnotic blast of psychedelic hard rock that captures the freewheeling spirit of the late-60s counterculture. Built on a churning, repetitive riff and frontman John Kay's raw vocals, it becomes an anthem of the era — evoking open highways, altered states, and a generation's hunger for liberation.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HPE9a_epmWw' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/steppenwolf.webp',
  popularity: 50,
};
