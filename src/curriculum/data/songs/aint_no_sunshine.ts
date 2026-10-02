import type { Song } from '@/curriculum/types/songLibrary';

export const aint_no_sunshine: Song = {
  id: 'aint_no_sunshine',
  title: 'Ain’t No Sunshine',
  artist: 'Bill Withers',
  year: 1971,
  historicalDescription:
    "Bill Withers releases 'Ain't No Sunshine' in 1971, a raw, aching meditation on loneliness that strips soul music down to its barest emotional core. The repeated 'I know, I know, I know' — a placeholder Withers never replaced — becomes one of the most iconic moments in American popular music. The song wins a Grammy and launches one of the most distinctive voices of the decade.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Bill Lazarus', role: 'engineer' },
    {
      name: 'Booker T. Jones',
      role: 'arranger',
      artistGlobeId: 'booker-t-jones',
    },
    { name: 'John Golden', role: 'engineer' },
    {
      name: 'Booker T. Jones',
      role: 'producer',
      artistGlobeId: 'booker-t-jones',
    },
    {
      name: 'Donald “Duck” Dunn',
      role: 'performer',
      instrument: 'electric-bass',
    },
    {
      name: 'Bill Halverson',
      role: 'engineer',
      artistGlobeId: 'bill-halverson',
    },
    {
      name: 'Al Jackson, Jr.',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'al-jackson-jr',
    },
    { name: 'Bill Withers', role: 'songwriter', artistGlobeId: 'bill-withers' },
    {
      name: 'Bill Withers',
      role: 'vocals',
      artistGlobeId: 'bill-withers',
      primary: true,
    },
    {
      name: 'Stephen Stills',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'stephen-stills',
    },
  ],
  releases: [{ releaseId: 'bill-withers-just-as-i-am' }],

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
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      bars: [{ chords: [], restBars: 6 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=YuKfiH0Scao' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bill-withers.webp',
  popularity: 50,
};
