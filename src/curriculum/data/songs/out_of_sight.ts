import type { Song } from '@/curriculum/types/songLibrary';

export const out_of_sight: Song = {
  id: 'out_of_sight',
  title: 'Out Of Sight',
  artist: 'James Brown',
  year: 1964,
  historicalDescription:
    "James Brown releases 'Out Of Sight' in 1964, a track that strips soul down to its rhythmic skeleton and points directly toward the birth of funk. The horn stabs, syncopated groove, and Brown's percussive vocal delivery shift the emphasis from melody to rhythm — a seismic move that will define popular Black music for the next decade and beyond.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=zieXmNwHGYA' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/james-brown.webp',
  popularity: 50,
};
