import type { Song } from '@/curriculum/types/songLibrary';

export const road_to_nowhere: Song = {
  id: 'road_to_nowhere',
  title: 'Road To Nowhere',
  artist: 'Talking Heads',
  year: 1985,
  historicalDescription:
    "Talking Heads release 'Road To Nowhere' in 1985, an unlikely anthem that opens with a lone a cappella choir before exploding into a jubilant, stomping march. The song captures the band at their most accessible — David Byrne's existential unease wrapped in a melody so infectious it feels like a celebration. It becomes one of the defining tracks of 1980s alternative rock, cementing Talking Heads as the thinking person's pop band.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'sigma-sound-studios' },
  credits: [
    {
      name: 'Jerry Harrison',
      role: 'arranger',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Jimmy MacDonell', role: 'performer', instrument: 'accordion' },
    { name: 'Lani Groves', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Ellen Bernfeld', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Lenny Pickett', role: 'performer' },
    { name: 'Diva Gray', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'Steve Scales', role: 'performer', instrument: 'bongos' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'Tina Weymouth', role: 'arranger', artistGlobeId: 'tina-weymouth' },
    { name: 'Steve Scales', role: 'performer', instrument: 'tambourine' },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'Chris Frantz', role: 'arranger', artistGlobeId: 'chris-frantz' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'Erin Dickens', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Gordon Grody', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'synth-bass',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Eric Thorngren', role: 'engineer' },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Steve Scales', role: 'performer', instrument: 'congas' },
    { name: 'Andrew Cader', role: 'performer' },
    { name: 'Kurt Yahijian', role: 'performer', instrument: 'backing-vocals' },
  ],
  releases: [{ releaseId: 'talking-heads-little-creatures', track: 9 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 1 },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=LQiOA7euaYA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
