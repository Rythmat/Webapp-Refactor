import type { Song } from '@/curriculum/types/songLibrary';

export const valerie: Song = {
  id: 'valerie',
  title: 'Valerie',
  artist: 'Amy Winehouse',
  year: 2007,
  historicalDescription:
    "Amy Winehouse records a cover of 'Valerie', originally by The Zutons, with producer Mark Ronson for his album 'Version'. Winehouse's raw, soulful delivery transforms the song into something entirely her own, blending vintage soul and Motown warmth with modern pop-rock energy. The track becomes one of the defining recordings of her career, showcasing the voice that had already captivated the world.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'Amy Winehouse',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'amy-winehouse',
    },
    { name: 'Ivo van der Werff', role: 'performer', instrument: 'viola' },
    {
      name: 'Boyan Chowdhury',
      role: 'songwriter',
      artistGlobeId: 'boyan-chowdhury',
    },
    { name: 'Jackie Shave', role: 'performer', instrument: 'violin' },
    { name: 'Dom Morley', role: 'engineer' },
    { name: 'David Woodcock', role: 'performer', instrument: 'violin' },
    { name: 'Binky Griptite', role: 'performer' },
    { name: 'Julian Leaper', role: 'performer', instrument: 'violin' },
    { name: 'Thomas Brenneck', role: 'performer' },
    { name: 'Dave Guy', role: 'performer', instrument: 'trumpet' },
    { name: 'Peter Lale', role: 'performer', instrument: 'viola' },
    { name: 'Mark Ronson', role: 'engineer', artistGlobeId: 'mark-ronson' },
    { name: 'Bosco Mann', role: 'engineer', artistGlobeId: 'bosco-mann' },
    { name: 'Neal Sugarman', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Mark Berrow', role: 'performer', instrument: 'violin' },
    { name: 'Nick Movshon', role: 'performer' },
    {
      name: 'Mark Ronson',
      role: 'performer',
      primary: true,
      artistGlobeId: 'mark-ronson',
    },
    { name: 'Tom Elmhirst', role: 'engineer' },
    { name: 'Sean Payne', role: 'songwriter', artistGlobeId: 'sean-payne' },
    { name: 'Boguslaw Kostecki', role: 'performer', instrument: 'violin' },
    { name: 'Homer Steinweiss', role: 'performer' },
    {
      name: 'Ian Hendrickson-Smith',
      role: 'performer',
      instrument: 'baritone-sax',
    },
    { name: 'Dave McCabe', role: 'songwriter', artistGlobeId: 'dave-mccabe' },
    { name: 'Mark Ronson', role: 'producer', artistGlobeId: 'mark-ronson' },
    { name: 'Cathy Thompson', role: 'performer', instrument: 'violin' },
    { name: 'Abi Harding', role: 'songwriter', artistGlobeId: 'abi-harding' },
    { name: 'Taz Mattar', role: 'engineer' },
    { name: 'Rachel Bolt', role: 'performer', instrument: 'viola' },
    {
      name: 'Russell Pritchard',
      role: 'songwriter',
      artistGlobeId: 'russell-pritchard',
    },
    { name: 'Chris Elliott', role: 'conductor' },
    { name: 'Chris Elliott', role: 'arranger' },
    { name: 'Everton Nelson', role: 'performer', instrument: 'violin' },
    { name: 'Thomas Bowes', role: 'performer', instrument: 'violin' },
    { name: 'Emlyn Singleton', role: 'performer', instrument: 'violin' },
    { name: 'Rita Manning', role: 'performer', instrument: 'violin' },
    { name: 'Derek Pacuk', role: 'engineer' },
    { name: 'Bruce White', role: 'performer', instrument: 'viola' },
    { name: 'Warren Zielinski', role: 'performer', instrument: 'violin' },
    { name: '?uestlove', role: 'performer', instrument: 'percussion' },
    { name: 'Jonathan Rees', role: 'performer', instrument: 'violin' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NowjRIm6eqY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/amy-winehouse.webp',
  popularity: 50,
};
