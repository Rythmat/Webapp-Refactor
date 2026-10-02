import type { Song } from '@/curriculum/types/songLibrary';

export const beyond: Song = {
  id: 'beyond',
  title: 'Beyond',
  artist: 'Leon Bridges',
  year: 2018,
  historicalDescription:
    "Leon Bridges releases 'Beyond', a tender pop ballad that marks a softer, more vulnerable side of the Fort Worth singer-songwriter. Where his debut announced a retro-soul revivalist, this song signals his evolution into a more expansive, contemporary sound — intimate and unhurried, built around emotional directness rather than stylistic homage.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 76,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Nate Mercereau',
      role: 'producer',
      artistGlobeId: 'nate-mercereau',
    },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Ricky Reed', role: 'producer', artistGlobeId: 'ricky-reed' },
    { name: 'Ricky Reed', role: 'songwriter', artistGlobeId: 'ricky-reed' },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Joshua Block', role: 'songwriter', artistGlobeId: 'joshua-block' },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'nate-mercereau',
    },
    {
      name: 'Nate Mercereau',
      role: 'songwriter',
      artistGlobeId: 'nate-mercereau',
    },
    {
      name: 'Nate Mercereau',
      role: 'engineer',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Manny Marroquin', role: 'engineer' },
    { name: 'Chris Galland', role: 'engineer' },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'nate-mercereau',
    },
    {
      name: 'Austin Jenkins',
      role: 'songwriter',
      artistGlobeId: 'austin-jenkins',
    },
    { name: 'Ethan Shumaker', role: 'engineer' },
    { name: 'Leon Bridges', role: 'songwriter', artistGlobeId: 'leon-bridges' },
    {
      name: 'Justin Tranter',
      role: 'songwriter',
      artistGlobeId: 'justin-tranter',
    },
    {
      name: 'Leon Bridges',
      role: 'vocals',
      artistGlobeId: 'leon-bridges',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'leon-bridges-good-thing', track: 4 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 1 },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ELPOCJvDz3w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/leon-bridges.webp',
  popularity: 50,
};
