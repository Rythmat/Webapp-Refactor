import type { Song } from '@/curriculum/types/songLibrary';

export const superstition: Song = {
  id: 'superstition',
  title: 'Superstition',
  artist: 'Stevie Wonder',
  year: 1972,
  historicalDescription:
    "Stevie Wonder records 'Superstition' in 1972, driven by a relentless clavinet riff and thunderous drums that redefine what funk can feel like. The track marks a turning point in Wonder's career — the moment he seizes full creative control and announces himself as one of the most vital artists of his generation. Its groove becomes a blueprint for funk and soul for decades to come.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  session: { studioId: 'electric-lady-studios' },
  credits: [
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'clavinet',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Malcolm Cecil', role: 'engineer' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Robert Margouleff', role: 'engineer' },
    { name: 'Steve Madaio', role: 'performer', instrument: 'trumpet' },
    { name: 'Joan DeCola', role: 'engineer' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Trevor Lawrence', role: 'performer' },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    { name: 'Austin Godsey', role: 'engineer' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
  ],
  releases: [{ releaseId: 'stevie-wonder-talking-book', track: 6 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ftdZ363R9kQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
