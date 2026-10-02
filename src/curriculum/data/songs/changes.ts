import type { Song } from '@/curriculum/types/songLibrary';

export const changes: Song = {
  id: 'changes',
  title: 'Changes',
  artist: 'David Bowie',
  year: 1972,
  historicalDescription:
    "David Bowie releases 'Changes' as the opening track of his Hunky Dory album, announcing himself as rock's great shape-shifter. The song's self-referential lyric — 'turn and face the strange' — becomes a manifesto for reinvention, foreshadowing the relentless identity transformations that will define his career from Ziggy Stardust to the Thin White Duke and beyond.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'trident-studios' },
  credits: [
    {
      name: 'David Bowie',
      role: 'vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'Mick Ronson', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'David Bowie',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'Mick Ronson', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Trevor Bolder', role: 'performer', instrument: 'electric-bass' },
    { name: 'BBC Symphony Orchestra', role: 'performer', ensemble: true },
    {
      name: 'David Bowie',
      role: 'performer',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'Mick Woodmansey', role: 'performer', instrument: 'drum-kit' },
    { name: 'Rick Wakeman', role: 'performer', instrument: 'piano' },
    { name: 'Ken Scott', role: 'producer', artistGlobeId: 'ken-scott' },
    { name: 'Daniel Licht', role: 'songwriter', artistGlobeId: 'daniel-licht' },
    { name: 'Mick Ronson', role: 'arranger' },
    { name: 'David Bowie', role: 'producer', artistGlobeId: 'david-bowie' },
    { name: 'Ken Scott', role: 'engineer', artistGlobeId: 'ken-scott' },
    { name: 'David Bowie', role: 'songwriter', artistGlobeId: 'david-bowie' },
  ],
  releases: [{ releaseId: 'david-bowie-hunky-dory' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '♭3 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '♭3 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'F/A', beat: 1, duration: 1 },
            { degree: '1 maj/5', chordName: 'C/G', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 1 },
            { degree: '5 maj/2', chordName: 'G/D', beat: 2, duration: 1 },
            { degree: '4 maj/6', chordName: 'F/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'F/A', beat: 1, duration: 1 },
            { degree: '1 maj/5', chordName: 'C/G', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 1 },
            { degree: '5 maj/2', chordName: 'G/D', beat: 2, duration: 1 },
            { degree: '4 maj/6', chordName: 'F/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4BgF7Y3q-as' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
