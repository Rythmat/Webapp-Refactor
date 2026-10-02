import type { Song } from '@/curriculum/types/songLibrary';

export const watermelon_sugar: Song = {
  id: 'watermelon_sugar',
  title: 'Watermelon Sugar',
  artist: 'Harry Styles',
  year: 2019,
  historicalDescription:
    "Harry Styles releases 'Watermelon Sugar', a sun-drenched, carefree anthem that signals his full evolution from One Direction teen idol to confident solo artist. With its breezy retro-pop-rock feel, the song captures a hedonistic summer energy and becomes one of his signature tracks — cementing his place as a defining pop voice of his generation.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Sarah Jones', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Mark “Top” Rankin', role: 'engineer' },
    {
      name: 'Tyler Johnson',
      role: 'songwriter',
      artistGlobeId: 'tyler-johnson',
    },
    { name: 'Kid Harpoon', role: 'songwriter', artistGlobeId: 'kid-harpoon' },
    {
      name: 'Mitch Rowland',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'mitch-rowland',
    },
    { name: 'Nick Lobel', role: 'engineer' },
    { name: 'Kid Harpoon', role: 'producer', artistGlobeId: 'kid-harpoon' },
    { name: 'Mark “Spike” Stent', role: 'engineer' },
    {
      name: 'Kid Harpoon',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'kid-harpoon',
    },
    { name: 'Davey Chegwidden', role: 'performer', instrument: 'percussion' },
    { name: 'Pino Palladino', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Tyler Johnson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tyler-johnson',
    },
    { name: 'Harry Styles', role: 'songwriter', artistGlobeId: 'harry-styles' },
    {
      name: 'Mitch Rowland',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'mitch-rowland',
    },
    { name: 'Tyler Johnson', role: 'producer', artistGlobeId: 'tyler-johnson' },
    { name: 'Sammy Witte', role: 'engineer' },
    {
      name: 'Mitch Rowland',
      role: 'songwriter',
      artistGlobeId: 'mitch-rowland',
    },
    {
      name: 'Harry Styles',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'harry-styles',
      primary: true,
    },
    {
      name: 'Mitch Rowland',
      role: 'performer',
      instrument: 'slide-guitar',
      artistGlobeId: 'mitch-rowland',
    },
    {
      name: 'Kid Harpoon',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'kid-harpoon',
    },
    {
      name: 'Tyler Johnson',
      role: 'performer',
      artistGlobeId: 'tyler-johnson',
    },
    {
      name: 'Harry Styles',
      role: 'vocals',
      artistGlobeId: 'harry-styles',
      primary: true,
    },
    { name: 'Ivan Jackson', role: 'performer', instrument: 'french-horn' },
    {
      name: 'Kid Harpoon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'kid-harpoon',
    },
    {
      name: 'Kid Harpoon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'kid-harpoon',
    },
  ],
  releases: [{ releaseId: 'harry-styles-fine-line' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=E07s5ZYygMg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/harry-styles.webp',
  popularity: 50,
};
