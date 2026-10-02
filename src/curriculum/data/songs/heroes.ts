import type { Song } from '@/curriculum/types/songLibrary';

export const heroes: Song = {
  id: 'heroes',
  title: 'Heroes',
  artist: 'David Bowie',
  year: 1977,
  historicalDescription:
    "David Bowie records 'Heroes' in West Berlin, inspired by the divided city and the Wall that splits it in two. Produced with Brian Eno and Tony Visconti, the song captures a moment of defiant romanticism against a backdrop of Cold War tension. It becomes one of Bowie's most enduring anthems — a testament to the Berlin Trilogy's radical reinvention of rock.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'hansa-studios' },
  credits: [
    { name: 'David Bowie', role: 'producer', artistGlobeId: 'david-bowie' },
    { name: 'David Bowie', role: 'songwriter', artistGlobeId: 'david-bowie' },
    {
      name: 'Brian Eno',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'brian-eno',
    },
    { name: 'Tony Visconti', role: 'producer', artistGlobeId: 'tony-visconti' },
    { name: 'Robert Fripp', role: 'performer' },
    {
      name: 'David Bowie',
      role: 'vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    { name: 'David Bowie', role: 'engineer', artistGlobeId: 'david-bowie' },
    {
      name: 'David Bowie',
      role: 'performer',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    {
      name: 'Carlos Alomar',
      role: 'performer',
      artistGlobeId: 'carlos-alomar',
    },
    { name: 'Tony Visconti', role: 'engineer', artistGlobeId: 'tony-visconti' },
    { name: 'David Richards', role: 'engineer' },
    { name: 'George Murray', role: 'performer' },
    { name: 'Brian Eno', role: 'performer', artistGlobeId: 'brian-eno' },
    { name: 'Dennis Davis', role: 'performer', instrument: 'percussion' },
  ],
  releases: [{ releaseId: 'david-bowie-heroes', track: 1 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lXgkuM2NhYI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
