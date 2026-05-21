import type { Song } from '@/curriculum/types/songLibrary';

export const wise_up: Song = {
  id: 'wise_up',
  title: 'Wise Up',
  artist: 'Aimee Mann',
  year: 1996,
  historicalDescription:
    "Aimee Mann writes 'Wise Up' as a spare, aching ballad that distills her gift for emotional precision into something almost unbearably intimate. The song later finds its defining cultural moment when Paul Thomas Anderson weaves it into the film Magnolia, where an entire ensemble cast sings it simultaneously — a rare cinematic rupture that elevates both the movie and Mann's reputation as one of America's most honest songwriters.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 64,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_ballad'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
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
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 maj/♭5', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 maj/♭5', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 maj/♭5', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '2 maj/♭5', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
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
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 sus4', chordName: 'Gsus2', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aNmKghTvj0E' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
