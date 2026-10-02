import type { Song } from '@/curriculum/types/songLibrary';

export const old_time_rock_and_roll: Song = {
  id: 'old_time_rock_and_roll',
  title: 'Old Time Rock And Roll',
  artist: 'Bob Seger',
  year: 1981,
  historicalDescription:
    "Bob Seger's 'Old Time Rock And Roll' becomes a generational anthem for classic rock purists who distrust the flashy sounds of disco and new wave. Already a staple of his live shows, the song crystallizes a defiant nostalgia — a working-class refusal to abandon the raw, guitar-driven music of the 1950s and 60s. Its cultural reach explodes when Tom Cruise slides across the floor in his socks in Risky Business in 1983.",
  key: 'F♯ blues',
  keyRoot: 66,
  mode: 'mixolydian',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'muscle-shoals-sound-studio' },
  credits: [
    {
      name: 'George Jackson',
      role: 'songwriter',
      artistGlobeId: 'george-jackson',
    },
    { name: 'Bob Seger', role: 'engineer', artistGlobeId: 'bob-seger' },
    { name: 'David Hood', role: 'performer' },
    { name: 'Ken Bell', role: 'performer' },
    {
      name: 'Thomas Jones, III',
      role: 'songwriter',
      artistGlobeId: 'thomas-jones-iii',
    },
    { name: 'Alto Reed', role: 'performer', artistGlobeId: 'alto-reed' },
    { name: 'James Easley', role: 'performer', instrument: 'backing-vocals' },
    { name: 'John Arrias', role: 'engineer' },
    {
      name: 'George Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'george-jackson',
    },
    { name: 'Forrest McDonald', role: 'performer' },
    { name: 'Gregg Hamm', role: 'engineer' },
    { name: 'Bob Seger', role: 'producer', artistGlobeId: 'bob-seger' },
    { name: 'Roger Hawkins', role: 'performer', instrument: 'percussion' },
    {
      name: 'Bob Seger',
      role: 'vocals',
      artistGlobeId: 'bob-seger',
      primary: true,
    },
    { name: 'Randy McCormick', role: 'performer', instrument: 'piano' },
    { name: 'Stanley Carter', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Roger Hawkins', role: 'performer', instrument: 'drum-kit' },
    { name: 'Punch', role: 'engineer' },
    {
      name: 'The Muscle Shoals Rhythm Section',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-muscle-shoals-rhythm-section',
    },
  ],
  releases: [
    { releaseId: 'bob-seger-and-the-silver-bullet-band-stranger-in-town' },
  ],

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
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=W1LsRShUPtY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-seger.webp',
  popularity: 50,
};
