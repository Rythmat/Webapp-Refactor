import type { Song } from '@/curriculum/types/songLibrary';

export const black_or_white: Song = {
  id: 'black_or_white',
  title: 'Black Or White',
  artist: 'Michael Jackson',
  year: 1991,
  historicalDescription:
    "Michael Jackson releases 'Black Or White' in 1991, a hard-hitting anthem for racial harmony that opens with Slash's blistering guitar riff and explodes into a global smash. Its music video premieres simultaneously across Fox, BET, and MTV to an audience of hundreds of millions — one of the most-watched video debuts in history. The song signals Jackson at the height of his cultural reach, speaking directly to a world grappling with race.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 115,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    { name: 'Brad Buxer', role: 'performer', instrument: 'percussion' },
    {
      name: 'Michael Jackson',
      role: 'producer',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'Andres McKenzie', role: 'vocals' },
    { name: 'Bill Bottrell', role: 'producer', artistGlobeId: 'bill-bottrell' },
    {
      name: 'Bill Bottrell',
      role: 'performer',
      artistGlobeId: 'bill-bottrell',
    },
    { name: 'Brad Buxer', role: 'performer' },
    { name: 'John Barnes', role: 'performer' },
    { name: 'Jasun Martz', role: 'performer' },
    { name: 'Tim Pierce', role: 'performer' },
    {
      name: 'Bill Bottrell',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'bill-bottrell',
    },
    {
      name: 'Michael Jackson',
      role: 'songwriter',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'L.T.B.', role: 'vocals' },
    {
      name: 'Slash',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'slash',
    },
    {
      name: 'Bill Bottrell',
      role: 'songwriter',
      artistGlobeId: 'bill-bottrell',
    },
    { name: 'Terry Jackson', role: 'performer', instrument: 'electric-bass' },
    { name: 'Bill Bottrell', role: 'engineer', artistGlobeId: 'bill-bottrell' },
    { name: 'Bryan Loren', role: 'performer', instrument: 'drum-kit' },
    { name: 'Matt Forger', role: 'engineer' },
    { name: 'Bryan Loren', role: 'performer', instrument: 'synthesizer' },
  ],
  releases: [{ releaseId: 'michael-jackson-dangerous', track: 8 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
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
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=F2AitTPI5U0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
