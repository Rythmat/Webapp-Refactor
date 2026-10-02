import type { Song } from '@/curriculum/types/songLibrary';

export const isnt_she_lovely: Song = {
  id: 'isnt_she_lovely',
  title: "Isn't She Lovely",
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Isn't She Lovely' on the landmark double album 'Songs in the Key of Life', a joyful celebration written for his newborn daughter Aisha. The song's infectious harmonica melody and euphoric groove capture Wonder at the peak of his creative powers — a period widely regarded as one of the most extraordinary runs in pop music history.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Josette Valentino', role: 'performer', instrument: 'handclaps' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'harmonica',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'fender-rhodes',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Brenda Barrett', role: 'performer', instrument: 'handclaps' },
    { name: 'Colleen Carleton', role: 'performer', instrument: 'handclaps' },
    { name: 'Greg Phillinganes', role: 'performer' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'synth-bass',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Nelson Hayes', role: 'performer', instrument: 'handclaps' },
    { name: 'Artece May', role: 'performer', instrument: 'handclaps' },
    { name: 'Carole Cole', role: 'performer', instrument: 'handclaps' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'electric-piano',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'David Henson', role: 'performer', instrument: 'handclaps' },
    { name: 'Edna Orso', role: 'performer', instrument: 'handclaps' },
    { name: 'Shirley Brewer', role: 'performer', instrument: 'handclaps' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Sundray Tucker', role: 'performer', instrument: 'handclaps' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oE56g61mW44' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
