import type { Song } from '@/curriculum/types/songLibrary';

export const havent_met_you_yet: Song = {
  id: 'havent_met_you_yet',
  title: "Haven't Met You Yet",
  artist: 'Michael Buble',
  year: 2009,
  historicalDescription:
    "Michael Bublé releases 'Haven't Met You Yet' as the lead single from his album Crazy Love, a buoyant jazz-pop declaration of romantic optimism that becomes one of his signature songs. Its big-band swing and Bublé's effortless crooning cement his place as the heir to the great American songbook tradition — but with a mainstream pop appeal that fills arenas worldwide.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz', 'pop'],
  techniques: [],
  credits: [
    { name: 'Rick Baptist', role: 'performer' },
    { name: 'Rusty Anderson', role: 'performer' },
    { name: 'Jacob Rodriguez', role: 'performer', instrument: 'baritone-sax' },
    { name: 'Bob Rock', role: 'arranger' },
    { name: 'Alan Chang', role: 'arranger', artistGlobeId: 'alan-chang' },
    { name: 'Alan Chang', role: 'songwriter', artistGlobeId: 'alan-chang' },
    {
      name: 'Michael Bublé',
      role: 'vocals',
      artistGlobeId: 'michael-buble',
      primary: true,
    },
    { name: 'Michael Landau', role: 'performer' },
    { name: 'Lenny Castro', role: 'performer', instrument: 'percussion' },
    { name: 'Josh Freese', role: 'performer', instrument: 'drum-kit' },
    { name: 'Keith Scott', role: 'performer' },
    {
      name: 'Alan Chang',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'alan-chang',
    },
    { name: 'Lou Pomanti', role: 'arranger' },
    { name: 'Nick Vayenas', role: 'performer', instrument: 'trombone' },
    { name: 'Joel Shearer', role: 'performer' },
    {
      name: 'Michael Bublé',
      role: 'songwriter',
      artistGlobeId: 'michael-buble',
    },
    {
      name: 'Amy Foster‐Gillies',
      role: 'songwriter',
      artistGlobeId: 'amy-foster-gillies',
    },
    { name: 'Paul Bushnell', role: 'performer' },
    { name: 'Justin Ray', role: 'performer', instrument: 'trumpet' },
    { name: 'Mike Allen', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Michael Bublé', role: 'arranger', artistGlobeId: 'michael-buble' },
  ],
  releases: [{ releaseId: 'michael-buble-crazy-love', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 maj/♯1', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 maj/♯1', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1AJmKkU5POA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-buble.webp',
  popularity: 50,
};
