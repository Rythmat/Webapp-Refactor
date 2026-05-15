import type { Song } from '@/curriculum/types/songLibrary';

export const fire_and_rain: Song = {
  id: 'fire_and_rain',
  title: 'Fire And Rain',
  artist: 'James Taylor',
  year: 1970,
  historicalDescription:
    "James Taylor releases 'Fire and Rain', a deeply personal account of loss, addiction, and survival that becomes one of the defining songs of the singer-songwriter movement. Its spare acoustic intimacy cuts through the bombast of late-60s rock, helping establish a quieter, more confessional mode of songwriting that shapes the entire decade to come.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 7', chordName: 'C7sus', beat: 4, duration: 1 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'C7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'C7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'C7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'C7sus', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_1nKGVDhQ60' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
