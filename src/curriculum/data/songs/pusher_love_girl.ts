import type { Song } from '@/curriculum/types/songLibrary';

export const pusher_love_girl: Song = {
  id: 'pusher_love_girl',
  title: 'Pusher Love Girl',
  artist: 'Justin Timberlake',
  year: 2013,
  historicalDescription:
    "Justin Timberlake opens his comeback album 'The 20/20 Experience' with 'Pusher Love Girl', a lush, slow-burning track that stretches past eight minutes and signals his full embrace of classic soul and funk. The song borrows its groove from the vintage sound of Sly Stone and Marvin Gaye, making clear that Timberlake is swinging for timeless rather than trendy. It announces his return as one of pop's most ambitious arrangers of his generation.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 70,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'larrabee-sound-studios' },
  credits: [
    {
      name: 'James Fauntleroy',
      role: 'songwriter',
      artistGlobeId: 'james-fauntleroy',
    },
    { name: 'Elliott Ives', role: 'performer' },
    { name: 'Chris Godbey', role: 'songwriter', artistGlobeId: 'chris-godbey' },
    {
      name: 'The Regiment Horns',
      role: 'performer',
      instrument: 'french-horn',
      ensemble: true,
    },
    { name: 'J‐Roc', role: 'producer', artistGlobeId: 'j-roc' },
    {
      name: 'Justin Timberlake',
      role: 'arranger',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Timbaland', role: 'songwriter', artistGlobeId: 'timbaland' },
    {
      name: 'Justin Timberlake',
      role: 'songwriter',
      artistGlobeId: 'justin-timberlake',
    },
    {
      name: 'Benjamin Wright',
      role: 'performer',
      instrument: 'string-section',
    },
    { name: 'J‐Roc', role: 'songwriter', artistGlobeId: 'j-roc' },
    {
      name: 'Justin Timberlake',
      role: 'engineer',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Reginald Dozier', role: 'engineer' },
    {
      name: 'The Benjamin Wright Orchestra',
      role: 'performer',
      instrument: 'string-section',
      ensemble: true,
    },
    { name: 'J‐Roc', role: 'performer', artistGlobeId: 'j-roc' },
    { name: 'Timbaland', role: 'producer', artistGlobeId: 'timbaland' },
    { name: 'Jimmy Douglass', role: 'engineer' },
    {
      name: 'Justin Timberlake',
      role: 'producer',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Chris Godbey', role: 'engineer', artistGlobeId: 'chris-godbey' },
  ],
  releases: [{ releaseId: 'justin-timberlake-the-20-20-experience', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'B', beat: 2, duration: 3 },
          ],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UuihPTzv4FY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/justin-timberlake.webp',
  popularity: 50,
};
