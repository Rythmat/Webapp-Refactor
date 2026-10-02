import type { Song } from '@/curriculum/types/songLibrary';

export const dont_stop_til_you_get_enough: Song = {
  id: 'dont_stop_til_you_get_enough',
  title: 'Don’t Stop ‘Til You Get Enough',
  artist: 'Michael Jackson',
  year: 1979,
  historicalDescription:
    "Michael Jackson releases 'Don't Stop 'Til You Get Enough' in 1979, his first solo single on Epic Records and the lead track from Off the Wall. Written and produced by Jackson himself, it announces his arrival as a fully formed adult artist — no longer the child star of the Jackson 5, but a commanding creative force blending disco, funk, and pop into something undeniably his own.",
  key: 'B mixolydian',
  keyRoot: 71,
  mode: 'mixolydian',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Greg Phillinganes', role: 'performer', instrument: 'piano' },
    {
      name: 'Bill Reichenbach, Jr.',
      role: 'performer',
      instrument: 'trombone',
    },
    {
      name: 'Mortonette Jenkins',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Greg Phillinganes', role: 'performer', instrument: 'synthesizer' },
    { name: 'Augie Johnson', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    { name: 'Marlo Henderson', role: 'performer' },
    { name: 'Jerry Hey', role: 'performer', instrument: 'trumpet' },
    { name: 'Louis Johnson', role: 'performer', instrument: 'electric-bass' },
    { name: 'Jerry Hey', role: 'arranger' },
    { name: 'Kim Hutchcroft', role: 'performer', instrument: 'tenor-sax' },
    {
      name: 'Greg Phillinganes',
      role: 'performer',
      instrument: 'fender-rhodes',
    },
    { name: 'Paulinho da Costa', role: 'performer', instrument: 'percussion' },
    { name: 'Gary Grant', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Zedric Williams',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Paulette McWilliams',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Bruce Swedien', role: 'engineer', artistGlobeId: 'bruce-swedien' },
    { name: 'Jerry Hey', role: 'performer' },
    { name: 'Larry Williams', role: 'performer', instrument: 'alto-sax' },
    { name: 'Gerald Vinci', role: 'performer', instrument: 'violin' },
    { name: 'Larry Williams', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Richard Heath', role: 'performer', instrument: 'percussion' },
    { name: 'Larry Williams', role: 'performer', instrument: 'flute' },
    { name: 'Jim Gilstrap', role: 'performer', instrument: 'backing-vocals' },
    { name: 'David Williams', role: 'performer' },
    {
      name: 'Randy Jackson',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'randy-jackson',
    },
    { name: 'Kim Hutchcroft', role: 'performer', instrument: 'baritone-sax' },
    {
      name: 'Michael Jackson',
      role: 'songwriter',
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Michael Jackson',
      role: 'producer',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'Sheila E.', role: 'performer', instrument: 'percussion' },
    { name: 'Benjamin Wright', role: 'arranger' },
    {
      name: 'Michael Jackson',
      role: 'arranger',
      artistGlobeId: 'michael-jackson',
    },
    { name: 'Kim Hutchcroft', role: 'performer', instrument: 'flute' },
    { name: 'Quincy Jones', role: 'producer' },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'michael-jackson',
      primary: true,
    },
    {
      name: 'John “JR” Robinson',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'john-jr-robinson',
    },
  ],
  releases: [{ releaseId: 'michael-jackson-off-the-wall' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Bmin7/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Bmin7/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=yURRmWtbTbo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
