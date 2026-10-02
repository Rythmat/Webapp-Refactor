import type { Song } from '@/curriculum/types/songLibrary';

export const wish_you_were_here: Song = {
  id: 'wish_you_were_here',
  title: 'Wish You Were Here',
  artist: 'Pink Floyd',
  year: 1975,
  historicalDescription:
    "Pink Floyd releases 'Wish You Were Here' in 1975, a haunting meditation on absence, alienation, and the tragic decline of founding member Syd Barrett. Built around a fingerpicked acoustic guitar motif and Roger Waters' aching vocals, the song becomes one of rock's most profound elegies — a quiet devastation amid the era's arena bombast.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'abbey-road-studios' },
  credits: [
    { name: 'Brian Humphries', role: 'engineer' },
    {
      name: 'Roger Waters',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'roger-waters',
    },
    {
      name: 'Richard Wright',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'richard-wright',
    },
    {
      name: 'David Gilmour',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'david-gilmour',
    },
    {
      name: 'Nick Mason',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'nick-mason',
    },
    { name: 'Nick Mason', role: 'performer', artistGlobeId: 'nick-mason' },
    { name: 'Roger Waters', role: 'songwriter', artistGlobeId: 'roger-waters' },
    {
      name: 'Richard Wright',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'richard-wright',
    },
    {
      name: 'David Gilmour',
      role: 'performer',
      artistGlobeId: 'david-gilmour',
    },
    { name: 'Roger Waters', role: 'performer', artistGlobeId: 'roger-waters' },
    {
      name: 'David Gilmour',
      role: 'songwriter',
      artistGlobeId: 'david-gilmour',
    },
    {
      name: 'Carlena Williams',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'David Gilmour',
      role: 'performer',
      instrument: 'pedal-steel',
      artistGlobeId: 'david-gilmour',
    },
    { name: 'Venetta Fields', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'David Gilmour',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'david-gilmour',
    },
    {
      name: 'Pink Floyd',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'pink-floyd',
    },
    { name: 'David Gilmour', role: 'vocals', artistGlobeId: 'david-gilmour' },
  ],
  releases: [{ releaseId: 'pink-floyd-wish-you-were-here' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=K6qj09OHvjw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/pink-floyd.webp',
  popularity: 50,
};
