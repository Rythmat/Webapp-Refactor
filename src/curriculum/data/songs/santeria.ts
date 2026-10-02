import type { Song } from '@/curriculum/types/songLibrary';

export const santeria: Song = {
  id: 'santeria',
  title: 'Santeria',
  artist: 'Sublime',
  year: 1996,
  historicalDescription:
    "Sublime releases 'Santeria' from their self-titled third album, a laid-back ska-punk meditation on heartbreak and obsession recorded in Long Beach, California. The song becomes one of the band's signature tracks — yet frontman Bradley Nowell never sees its success, dying of a heroin overdose two months before the album drops. His absence makes Sublime's sun-soaked blend of punk, reggae, and hip hop feel all the more bittersweet.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['reggae', 'rock'],
  techniques: [],
  session: { studioId: 'pedernales-recording-studio' },
  credits: [
    { name: 'Eric Wilson', role: 'performer', artistGlobeId: 'eric-wilson' },
    { name: 'Bradley Nowell', role: 'vocals', artistGlobeId: 'bradley-nowell' },
    { name: 'Paul Leary', role: 'engineer', artistGlobeId: 'paul-leary' },
    {
      name: 'Bud Gaugh',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'bud-gaugh',
    },
    { name: 'Eric Wilson', role: 'songwriter', artistGlobeId: 'eric-wilson' },
    { name: 'Paul Leary', role: 'producer', artistGlobeId: 'paul-leary' },
    {
      name: 'Bradley Nowell',
      role: 'songwriter',
      artistGlobeId: 'bradley-nowell',
    },
    { name: 'Bud Gaugh', role: 'songwriter', artistGlobeId: 'bud-gaugh' },
    {
      name: 'Bradley Nowell',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'bradley-nowell',
    },
    { name: 'Stuart Sullivan', role: 'engineer' },
  ],
  releases: [{ releaseId: 'sublime-sublime', track: 6 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_5',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=AEYN5w4T_aM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sublime.webp',
  popularity: 50,
};
