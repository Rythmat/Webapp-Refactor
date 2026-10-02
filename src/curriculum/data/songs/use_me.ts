import type { Song } from '@/curriculum/types/songLibrary';

export const use_me: Song = {
  id: 'use_me',
  title: 'Use Me',
  artist: 'Bill Withers',
  year: 1972,
  historicalDescription:
    "Bill Withers releases 'Use Me' in 1972, a slow-burning funk groove that showcases his gift for turning raw, unadorned emotion into something irresistible. Where many soul artists leaned on orchestration, Withers strips the song down to a locked-in rhythm and his plainspoken baritone — a voice that sounds like it has lived every word. The track becomes one of his signature recordings, cementing his place as a singular voice in 1970s R&B.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 80,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  session: { studioId: 'the-record-plant-los-angeles' },
  credits: [
    {
      name: 'James Gadson',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'james-gadson',
    },
    {
      name: 'Melvin Dunlap',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'melvin-dunlap',
    },
    { name: 'Melvin Dunlap', role: 'producer', artistGlobeId: 'melvin-dunlap' },
    { name: 'Bill Withers', role: 'producer', artistGlobeId: 'bill-withers' },
    { name: 'Phil Schier', role: 'engineer' },
    {
      name: 'Bill Withers',
      role: 'vocals',
      artistGlobeId: 'bill-withers',
      primary: true,
    },
    {
      name: 'James Gadson',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'james-gadson',
    },
    { name: 'Bill Withers', role: 'songwriter', artistGlobeId: 'bill-withers' },
    {
      name: 'Raymond Jackson',
      role: 'producer',
      artistGlobeId: 'raymond-jackson',
    },
    { name: 'James Gadson', role: 'producer', artistGlobeId: 'james-gadson' },
    {
      name: 'Benorce Blackmon',
      role: 'producer',
      artistGlobeId: 'benorce-blackmon',
    },
    {
      name: 'Raymond Jackson',
      role: 'performer',
      instrument: 'wurlitzer',
      artistGlobeId: 'raymond-jackson',
    },
    { name: 'Bob Hughes', role: 'engineer' },
    {
      name: 'Benorce Blackmon',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'benorce-blackmon',
    },
    {
      name: 'Raymond Jackson',
      role: 'performer',
      instrument: 'clavinet',
      artistGlobeId: 'raymond-jackson',
    },
  ],
  releases: [{ releaseId: 'bill-withers-still-bill' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      instrumental: true,
      bars: [{ chords: [], restBars: 4, repeatEnd: true, repeatTimes: 3 }],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=LuzlbR5V_hc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bill-withers.webp',
  popularity: 50,
};
