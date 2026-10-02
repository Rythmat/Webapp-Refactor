import type { Song } from '@/curriculum/types/songLibrary';

export const thriller: Song = {
  id: 'thriller',
  title: 'Thriller',
  artist: 'Michael Jackson',
  year: 1982,
  historicalDescription:
    "Michael Jackson releases 'Thriller' in 1982, anchoring the best-selling album of all time. The song's horror-movie theatrics — complete with Vincent Price's menacing spoken-word breakdown — push the boundaries of pop music into cinematic territory. The accompanying 14-minute music video, directed by John Landis, transforms MTV and redefines what a music video can be.",
  key: 'C♯ dorian',
  keyRoot: 61,
  mode: 'dorian',
  tempo: 117,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'westlake-recording-studios' },
  credits: [
    { name: 'Larry Williams', role: 'performer', instrument: 'flute' },
    {
      name: 'Michael Jackson',
      role: 'vocals',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    { name: 'Jerry Hey', role: 'arranger' },
    { name: 'Jerry Hey', role: 'performer' },
    { name: 'Vincent Price', role: 'vocals' },
    { name: 'David Williams', role: 'performer' },
    { name: 'Larry Williams', role: 'performer' },
    { name: 'Quincy Jones', role: 'producer' },
    {
      name: 'Rod Temperton',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'rod-temperton',
    },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'drum-machine',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    { name: 'Gary Grant', role: 'performer' },
    { name: 'Greg Phillinganes', role: 'performer', instrument: 'synthesizer' },
    { name: 'Bruce Swedien', role: 'engineer', artistGlobeId: 'bruce-swedien' },
    { name: 'Brian Banks', role: 'performer', instrument: 'synthesizer' },
    {
      name: 'Bill Reichenbach, Jr.',
      role: 'performer',
      instrument: 'trombone',
    },
    { name: 'Rod Temperton', role: 'arranger', artistGlobeId: 'rod-temperton' },
    { name: 'Jerry Hey', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Rod Temperton',
      role: 'songwriter',
      artistGlobeId: 'rod-temperton',
    },
    { name: 'Gary Grant', role: 'performer', instrument: 'trumpet' },
  ],
  releases: [{ releaseId: 'michael-jackson-thriller', track: 4 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/♭7',
              chordName: 'C♯min7/B',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'A♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'D♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=sOnqjkJTMaA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
