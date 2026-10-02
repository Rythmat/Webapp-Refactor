import type { Song } from '@/curriculum/types/songLibrary';

export const raise_your_glass: Song = {
  id: 'raise_your_glass',
  title: 'Raise Your Glass',
  artist: 'Pink',
  year: 2010,
  historicalDescription:
    "Pink's anthemic 'Raise Your Glass' becomes a rallying cry for the outsiders, the underdogs, and the unapologetically different. Blending pop-rock attitude with a defiant message of self-acceptance, it cements Pink's reputation as one of pop's most authentic voices — never chasing trends, always championing those who don't fit the mold.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'woodshed-recording' },
  credits: [
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Shellback', role: 'engineer', artistGlobeId: 'shellback' },
    { name: 'Max Martin', role: 'engineer', artistGlobeId: 'max-martin' },
    { name: 'Michael Ilbert', role: 'engineer' },
    { name: 'Shellback', role: 'songwriter', artistGlobeId: 'shellback' },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'shellback',
    },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Shellback', role: 'performer', artistGlobeId: 'shellback' },
    { name: 'Pink', role: 'songwriter', artistGlobeId: 'pink' },
    { name: 'John Hanes', role: 'engineer' },
    { name: 'Shellback', role: 'producer', artistGlobeId: 'shellback' },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 13 },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XjVNlG5cZyQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/pink.webp',
  popularity: 50,
};
