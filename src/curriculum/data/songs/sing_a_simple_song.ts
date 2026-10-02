import type { Song } from '@/curriculum/types/songLibrary';

export const sing_a_simple_song: Song = {
  id: 'sing_a_simple_song',
  title: 'Sing a Simple Song',
  artist: 'Sly and the Family Stone',
  year: 1968,

  historicalDescription:
    "Sly and the Family Stone release 'Sing a Simple Song', a deceptively modest title hiding one of the most influential funk grooves ever recorded. The track's interlocking rhythms and raw, communal energy capture the spirit of a band that breaks every racial and gender barrier in popular music — proving that funk is not just a genre but a philosophy.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Sly Stone', role: 'songwriter', artistGlobeId: 'sly-stone' },
  ],
  releases: [{ releaseId: 'sly-and-the-family-stone-stand' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=42YGprrAOj0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sly-and-the-family-stone.webp',
  popularity: 50,
};
