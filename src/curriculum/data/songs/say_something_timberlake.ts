import type { Song } from '@/curriculum/types/songLibrary';

export const say_something_timberlake: Song = {
  id: 'say_something_timberlake',
  title: 'Say Something',
  artist: 'Justin Timberlake, Chris Stapleton',
  year: 2018,

  historicalDescription:
    "Justin Timberlake and Chris Stapleton join forces on 'Say Something', a soulful collision of pop polish and raw country grit. The collaboration bridges two worlds rarely occupying the same space, with Stapleton's weathered voice grounding Timberlake's sleek R&B instincts in something earthier and more urgent.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Justin Timberlake',
      role: 'performer',
      primary: true,
      artistGlobeId: 'justin-timberlake',
    },
    {
      name: 'Justin Timberlake',
      role: 'producer',
      artistGlobeId: 'justin-timberlake',
    },
    {
      name: 'Chris Stapleton',
      role: 'performer',
      primary: true,
      artistGlobeId: 'chris-stapleton',
    },
    {
      name: 'James Fauntleroy',
      role: 'songwriter',
      artistGlobeId: 'james-fauntleroy',
    },
    {
      name: 'Chris Stapleton',
      role: 'songwriter',
      artistGlobeId: 'chris-stapleton',
    },
    { name: 'Timbaland', role: 'songwriter', artistGlobeId: 'timbaland' },
    { name: 'Danja', role: 'producer', artistGlobeId: 'danja' },
    { name: 'Timbaland', role: 'producer', artistGlobeId: 'timbaland' },
    {
      name: 'Justin Timberlake',
      role: 'songwriter',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Danja', role: 'songwriter', artistGlobeId: 'danja' },
    {
      name: 'Larrance Dopson',
      role: 'songwriter',
      artistGlobeId: 'larrance-dopson',
    },
  ],
  releases: [{ releaseId: 'justin-timberlake-man-of-the-woods', track: 9 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8MPbR6Cbwi4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/justin-timberlake.webp',
  popularity: 50,
};
