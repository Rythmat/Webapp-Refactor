import type { Song } from '@/curriculum/types/songLibrary';

export const crocodile_rock: Song = {
  id: 'crocodile_rock',
  title: 'Crocodile Rock',
  artist: 'Elton John',
  year: 1972,
  historicalDescription:
    "Elton John releases 'Crocodile Rock' in 1972, a jubilant burst of nostalgia that becomes his first US number one single. The song pays loving homage to the rock and roll of the 1950s and early 60s — Buddy Holly, Eddie Cochran, and the dances of a vanished youth — while planting Elton firmly at the center of glam-era pop stardom.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'chateau-dherouville' },
  credits: [
    { name: 'Dee Murray', role: 'performer', instrument: 'electric-bass' },
    { name: 'Gus Dudgeon', role: 'producer', artistGlobeId: 'gus-dudgeon' },
    { name: 'Nigel Olsson', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Elton John',
      role: 'vocals',
      artistGlobeId: 'elton-john',
      primary: true,
    },
    {
      name: 'Davey Johnstone',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'Elton John', role: 'songwriter', artistGlobeId: 'elton-john' },
    {
      name: 'Elton John',
      role: 'performer',
      artistGlobeId: 'elton-john',
      primary: true,
    },
    {
      name: 'Bernie Taupin',
      role: 'songwriter',
      artistGlobeId: 'bernie-taupin',
    },
    { name: 'Ken Scott', role: 'engineer', artistGlobeId: 'ken-scott' },
    {
      name: 'Elton John',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'elton-john',
      primary: true,
    },
  ],
  releases: [
    { releaseId: 'elton-john-dont-shoot-me-im-only-the-piano-player' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
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
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
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
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
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
        {
          chords: [{ degree: '2 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
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
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=75r0nQu-hMs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/elton-john.webp',
  popularity: 50,
};
