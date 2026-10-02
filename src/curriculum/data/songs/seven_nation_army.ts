import type { Song } from '@/curriculum/types/songLibrary';

export const seven_nation_army: Song = {
  id: 'seven_nation_army',
  title: 'Seven Nation Army',
  artist: 'White Stripes',
  year: 2003,
  historicalDescription:
    "The White Stripes release 'Seven Nation Army', built around one of the most recognizable guitar riffs in modern rock — a bassline-like melody played on a single guitar run through an octave pedal. Jack and Meg White strip rock down to its barest bones, proving that two people and a deceptively simple hook can shake stadiums. The riff becomes a global chant, adopted by sports crowds worldwide.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'toe-rag-studios' },
  credits: [
    { name: 'Jack White', role: 'vocals', artistGlobeId: 'jack-white' },
    { name: 'Jack White', role: 'engineer', artistGlobeId: 'jack-white' },
    {
      name: 'Meg White',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'meg-white',
    },
    {
      name: 'Jack White',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jack-white',
    },
    { name: 'Meg White', role: 'vocals', artistGlobeId: 'meg-white' },
    { name: 'Jack White', role: 'performer', artistGlobeId: 'jack-white' },
    { name: 'Jack White', role: 'songwriter', artistGlobeId: 'jack-white' },
    { name: 'Liam Watson', role: 'engineer' },
    { name: 'Jack White', role: 'producer', artistGlobeId: 'jack-white' },
  ],
  releases: [{ releaseId: 'white-stripes-elephant', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '♭3 5', chordName: 'G5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 5', chordName: 'G5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 5', chordName: 'A5', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 5,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=0J2QdDbelmY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/white-stripes.webp',
  popularity: 50,
};
