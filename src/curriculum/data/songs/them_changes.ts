import type { Song } from '@/curriculum/types/songLibrary';

export const them_changes: Song = {
  id: 'them_changes',
  title: 'Them Changes',
  artist: 'Buddy Miles',
  year: 1970,
  historicalDescription:
    "Buddy Miles releases 'Them Changes', a raw funk-rock anthem that showcases his powerhouse drumming and soulful vocals. The track becomes one of the defining grooves of the early 1970s, bridging the gap between psychedelic rock and hard funk — a sound Miles had been forging alongside Jimi Hendrix in the Band of Gypsys.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_DDbjm_fId8' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/buddy-miles.webp',
  popularity: 50,
};
