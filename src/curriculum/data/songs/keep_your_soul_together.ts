import type { Song } from '@/curriculum/types/songLibrary';

export const keep_your_soul_together: Song = {
  id: 'keep_your_soul_together',
  title: 'Keep Your Soul Together',
  artist: 'Freddie Hubbard',
  year: 1973,
  historicalDescription:
    "Freddie Hubbard records 'Keep Your Soul Together' in 1973, capturing the moment jazz fully embraces funk and soul without apology. The track rides a loose, rolling groove that reflects the era's hunger for music that moves the body as much as the mind — a sound rooted in the hard bop tradition but reaching toward something earthier and more communal.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'jazz'],
  techniques: [],
  session: { studioId: 'van-gelder-studio' },
  credits: [
    { name: 'Creed Taylor', role: 'producer', artistGlobeId: 'creed-taylor' },
    { name: 'Junior Cook', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Ralph Penland', role: 'performer', instrument: 'drum-kit' },
    { name: 'Juno Lewis', role: 'performer', instrument: 'percussion' },
    {
      name: 'Freddie Hubbard',
      role: 'songwriter',
      artistGlobeId: 'freddie-hubbard',
    },
    {
      name: 'Freddie Hubbard',
      role: 'performer',
      artistGlobeId: 'freddie-hubbard',
      primary: true,
    },
    { name: 'Ron Carter', role: 'performer' },
    { name: 'George Cables', role: 'performer', instrument: 'electric-piano' },
    { name: 'Kent Brinkley', role: 'performer' },
    { name: 'Rudy van Gelder', role: 'engineer' },
    { name: 'Aurell Ray', role: 'performer' },
  ],
  releases: [{ releaseId: 'freddie-hubbard-keep-your-soul-together' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/♭3',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'G7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '1 dom7/3', chordName: 'C7/E', beat: 3, duration: 2 },
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
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'B7sus', beat: 1, duration: 2 },
            { degree: '♭2 dim7', chordName: 'D♭dim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '1 min7/♭3',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8mgtk460AhI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/freddie-hubbard.webp',
  popularity: 50,
};
