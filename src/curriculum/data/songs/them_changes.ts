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
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
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
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
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
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      instrumental: true,
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
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_DDbjm_fId8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/buddy-miles.webp',
  popularity: 50,
};
