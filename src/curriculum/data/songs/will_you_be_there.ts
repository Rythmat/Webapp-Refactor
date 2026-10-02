import type { Song } from '@/curriculum/types/songLibrary';

export const will_you_be_there: Song = {
  id: 'will_you_be_there',
  title: 'Will You Be There',
  artist: 'Michael Jackson',
  year: 1993,
  historicalDescription:
    "Michael Jackson releases 'Will You Be There' as part of the Dangerous era, a sweeping gospel-infused ballad that opens with a sample of Beethoven's Ninth Symphony before building into a soaring plea for unconditional love. Featured in the film Free Willy, the song reaches millions and showcases Jackson at his most emotionally raw — gospel, orchestral pop, and vulnerability fused into one unforgettable moment.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 83,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Paulinho da Costa', role: 'performer', instrument: 'percussion' },
    { name: 'Rhett Lawrence', role: 'performer', instrument: 'synthesizer' },
    {
      name: 'The Andraé Crouch Singers',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    { name: 'Brad Buxer', role: 'performer', instrument: 'percussion' },
    {
      name: 'Michael Jackson',
      role: 'producer',
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    { name: 'Johnny Mandel', role: 'conductor' },
    { name: 'Bruce Swedien', role: 'producer', artistGlobeId: 'bruce-swedien' },
    { name: 'Greg Phillinganes', role: 'performer' },
    { name: 'Greg Phillinganes', role: 'arranger' },
    { name: 'Sandra Crouch', role: 'arranger' },
    {
      name: 'Bruce Swedien',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'bruce-swedien',
    },
    {
      name: 'Michael Jackson',
      role: 'songwriter',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'Michael Boddicker', role: 'performer', instrument: 'synthesizer' },
    { name: 'Matt Forger', role: 'engineer' },
    {
      name: 'Michael Jackson',
      role: 'arranger',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'Andraé Crouch', role: 'arranger' },
    { name: 'Johnny Mandel', role: 'arranger' },
    { name: 'Brad Buxer', role: 'performer' },
    { name: 'Bruce Swedien', role: 'engineer', artistGlobeId: 'bruce-swedien' },
    { name: 'Brad Buxer', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Bruce Swedien',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'bruce-swedien',
    },
  ],
  releases: [{ releaseId: 'michael-jackson-dangerous', track: 11 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 8 },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 8 },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
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
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'F♯min7/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7/2', chordName: 'F♯min7/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♯4 min7/3',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♯4 min7/3',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭6 min7/♭5',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭6 min7/♭5',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jQY_QL_wvQU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
