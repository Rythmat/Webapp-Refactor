import type { Song } from '@/curriculum/types/songLibrary';

export const perfect: Song = {
  id: 'perfect',
  title: 'Perfect',
  artist: 'Ed Sheeran',
  year: 2017,
  historicalDescription:
    "Ed Sheeran releases 'Perfect' in 2017, a sweeping romantic ballad that becomes one of the best-selling singles of the year worldwide. Written about his then-girlfriend (and future wife) Cherry Seaborn, the song channels classic love song tradition into a modern pop setting — earning Sheeran his second UK number one from the Divide album and cementing his reputation as the defining balladeer of his generation.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 64,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Ed Sheeran', role: 'songwriter', artistGlobeId: 'ed-sheeran' },
    { name: 'Leon Bosch', role: 'performer', instrument: 'upright-bass' },
    { name: 'Patrick Kiernan', role: 'performer', instrument: 'violin' },
    { name: 'Tim Lowe', role: 'performer', instrument: 'cello' },
    { name: 'Peter Gregson', role: 'conductor' },
    { name: 'Simon Hewitt Jones', role: 'performer', instrument: 'violin' },
    { name: 'Mandhira de Saram', role: 'performer', instrument: 'violin' },
    { name: 'Matthew Denton', role: 'performer', instrument: 'violin' },
    { name: 'Ben Russell', role: 'performer', instrument: 'upright-bass' },
    {
      name: 'Will Hicks',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'will-hicks',
    },
    {
      name: 'Ed Sheeran',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Will Hicks', role: 'producer', artistGlobeId: 'will-hicks' },
    { name: 'Charys Green', role: 'performer', instrument: 'clarinet' },
    { name: 'Mark “Spike” Stent', role: 'engineer' },
    { name: 'Jan Regulski', role: 'performer', instrument: 'violin' },
    { name: 'Jay Lewis', role: 'performer', instrument: 'drum-kit' },
    { name: 'Debbie Widdup', role: 'performer', instrument: 'violin' },
    { name: 'Magnus Johnston', role: 'performer', instrument: 'violin' },
    { name: 'John Tilley', role: 'performer', instrument: 'piano' },
    { name: 'Matt Sheeran', role: 'arranger' },
    { name: 'Nick Cartledge', role: 'performer' },
    { name: 'Laurie Anderson', role: 'performer', instrument: 'viola' },
    { name: 'Martyn Jackson', role: 'performer', instrument: 'violin' },
    { name: 'Pino Palladino', role: 'performer' },
    {
      name: 'Will Hicks',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'will-hicks',
    },
    { name: 'Joe Rubel', role: 'engineer' },
    { name: 'Nick Cooper', role: 'performer', instrument: 'cello' },
    {
      name: 'Ed Sheeran',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Alison Dods', role: 'performer', instrument: 'violin' },
    { name: 'Jeremy Morris', role: 'performer', instrument: 'violin' },
    { name: 'Katherine Jenkinson', role: 'performer', instrument: 'cello' },
    { name: 'Chris Sclafani', role: 'engineer' },
    {
      name: 'Ed Sheeran',
      role: 'vocals',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Ed Sheeran', role: 'producer', artistGlobeId: 'ed-sheeran' },
    { name: 'Rachel Roberts', role: 'performer', instrument: 'viola' },
    { name: 'James Dickenson', role: 'performer', instrument: 'violin' },
    {
      name: 'Ed Sheeran',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Meghan Cassidy', role: 'performer', instrument: 'viola' },
    { name: 'John Tilley', role: 'performer', instrument: 'hammond-organ' },
    { name: 'Kotono Sato', role: 'performer', instrument: 'viola' },
    { name: 'benny blanco', role: 'producer', artistGlobeId: 'benny-blanco' },
    { name: 'Marije Johnston', role: 'performer', instrument: 'violin' },
    { name: 'Kirsty Mangan', role: 'performer', instrument: 'violin' },
    { name: 'Nick Cartledge', role: 'performer', instrument: 'flute' },
    { name: 'Fenella Barton', role: 'performer', instrument: 'violin' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'E♭/G', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Fmin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'E♭/G', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Fmin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2Vv-BfVoq4g' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ed-sheeran.webp',
  popularity: 50,
};
