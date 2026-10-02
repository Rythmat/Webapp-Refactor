import type { Song } from '@/curriculum/types/songLibrary';

export const against_the_wind: Song = {
  id: 'against_the_wind',
  title: 'Against The Wind',
  artist: 'Bob Seger & The Silver Bullet Band',
  year: 1980,

  historicalDescription:
    "Bob Seger & The Silver Bullet Band release 'Against The Wind', a reflective anthem about the passage of time, freedom, and the cost of living life on the road. The song captures the worn wisdom of a working-class rock and roller — the kind of heartland voice Seger had been honing for over a decade. It becomes one of his signature recordings, resonating deeply with an audience who had grown up alongside him.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'bayshore-recording-studios' },
  credits: [
    {
      name: 'Bob Seger',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'bob-seger',
    },
    {
      name: 'Glenn Frey',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'glenn-frey',
    },
    { name: 'Bill Szymczyk', role: 'engineer', artistGlobeId: 'bill-szymczyk' },
    {
      name: 'Drew Abbott',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'drew-abbott',
    },
    {
      name: 'David Teegarden',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'david-teegarden',
    },
    { name: 'Bob Seger', role: 'vocals', artistGlobeId: 'bob-seger' },
    { name: 'Bob Seger', role: 'performer', artistGlobeId: 'bob-seger' },
    {
      name: 'Chris Campbell',
      role: 'performer',
      artistGlobeId: 'chris-campbell',
    },
    { name: 'Alto Reed', role: 'performer', artistGlobeId: 'alto-reed' },
    { name: 'Bob Seger', role: 'songwriter', artistGlobeId: 'bob-seger' },
    {
      name: 'Bob Seger',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'bob-seger',
    },
    { name: 'Drew Abbott', role: 'performer', artistGlobeId: 'drew-abbott' },
    { name: 'Paul Harris', role: 'performer', instrument: 'organ' },
    {
      name: 'David Teegarden',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'david-teegarden',
    },
    {
      name: 'Chris Campbell',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'chris-campbell',
    },
    { name: 'Paul Harris', role: 'performer', instrument: 'piano' },
    { name: 'Bill Szymczyk', role: 'producer', artistGlobeId: 'bill-szymczyk' },
  ],
  releases: [
    { releaseId: 'bob-seger-and-the-silver-bullet-band-against-the-wind' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2vRsEC65NTA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-seger.webp',
  popularity: 50,
};
