import type { Song } from '@/curriculum/types/songLibrary';

export const lovely_day: Song = {
  id: 'lovely_day',
  title: 'Lovely Day',
  artist: 'Bill Withers',
  year: 1977,
  historicalDescription:
    "Bill Withers releases 'Lovely Day', anchored by one of the longest sustained vocal notes in pop history — a single held note that becomes the song's signature. The warm, gospel-tinged R&B track captures Withers at the height of his powers, blending everyday optimism with a soulful delivery that few singers can match. It endures as a timeless anthem of simple human joy.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Skip Scarborough',
      role: 'songwriter',
      artistGlobeId: 'skip-scarborough',
    },
    {
      name: 'Clarence McDonald',
      role: 'performer',
      artistGlobeId: 'clarence-mcdonald',
    },
    {
      name: 'Clarence McDonald',
      role: 'arranger',
      artistGlobeId: 'clarence-mcdonald',
    },
    {
      name: 'Clarence McDonald',
      role: 'producer',
      artistGlobeId: 'clarence-mcdonald',
    },
    { name: 'Jerry Knight', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Bill Withers',
      role: 'vocals',
      artistGlobeId: 'bill-withers',
      primary: true,
    },
    { name: 'Russ Kunkel', role: 'performer' },
    { name: 'Bill Withers', role: 'producer', artistGlobeId: 'bill-withers' },
    {
      name: 'Ralph MacDonald',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ralph-macdonald',
    },
    { name: 'Ray Parker Jr.', role: 'performer' },
    { name: 'Russ Kunkel', role: 'performer', instrument: 'drum-kit' },
    { name: 'Bill Withers', role: 'songwriter', artistGlobeId: 'bill-withers' },
  ],
  releases: [{ releaseId: 'bill-withers-menagerie' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=bEeaS6fuUoA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bill-withers.webp',
  popularity: 50,
};
