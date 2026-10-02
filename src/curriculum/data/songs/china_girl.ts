import type { Song } from '@/curriculum/types/songLibrary';

export const china_girl: Song = {
  id: 'china_girl',
  title: 'China Girl',
  artist: 'David Bowie',
  year: 1983,
  historicalDescription:
    "David Bowie re-records 'China Girl' for his landmark 1983 album 'Let's Dance', a song he originally co-wrote with Iggy Pop in 1977. The sleek, pop-polished version catapults Bowie into mainstream superstardom, becoming one of his biggest commercial hits and marking his decisive shift from avant-garde glam rock to radio-friendly new wave pop.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 136,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'power-station-at-berkleenyc' },
  credits: [
    { name: 'David Bowie', role: 'songwriter', artistGlobeId: 'david-bowie' },
    {
      name: 'Stevie Ray Vaughan',
      role: 'performer',
      artistGlobeId: 'stevie-ray-vaughan',
    },
    { name: 'Bob Clearmountain', role: 'engineer' },
    { name: 'David Spinner', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Iggy Pop', role: 'songwriter', artistGlobeId: 'iggy-pop' },
    { name: 'Carmine Rojas', role: 'performer' },
    { name: 'George Simms', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Sammy Figueroa', role: 'performer', instrument: 'percussion' },
    { name: 'Nile Rodgers', role: 'producer', artistGlobeId: 'nile-rodgers' },
    { name: 'Omar Hakim', role: 'performer', instrument: 'drum-kit' },
    { name: 'David Bowie', role: 'producer', artistGlobeId: 'david-bowie' },
    { name: 'Frank Simms', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'David Bowie',
      role: 'vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'Nile Rodgers', role: 'performer', artistGlobeId: 'nile-rodgers' },
    { name: 'Rob Sabino', role: 'performer' },
  ],
  releases: [{ releaseId: 'david-bowie-lets-dance' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
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
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
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
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
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
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
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
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
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
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_YC3sTbAPcU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
