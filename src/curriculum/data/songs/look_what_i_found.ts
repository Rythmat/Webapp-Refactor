import type { Song } from '@/curriculum/types/songLibrary';

export const look_what_i_found: Song = {
  id: 'look_what_i_found',
  title: 'Look What I Found',
  artist: 'Lady Gaga',
  year: 2018,
  historicalDescription:
    "Lady Gaga contributes 'Look What I Found' to the soundtrack of 'A Star Is Born', the 2018 film in which she also stars alongside Bradley Cooper. The pop-rock track showcases Gaga's range beyond her electronic dance roots, reinforcing the film's narrative of an artist discovering her voice. The soundtrack becomes one of the most celebrated musical achievements of her career.",
  key: 'C♯ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'the-village' },
  credits: [
    {
      name: 'Mark Nilan, Jr.',
      role: 'songwriter',
      artistGlobeId: 'mark-nilan-jr',
    },
    { name: 'Andy Martin', role: 'performer', instrument: 'trombone' },
    {
      name: 'Lady Gaga',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'lady-gaga',
      primary: true,
    },
    { name: 'Lukas Nelson', role: 'performer', artistGlobeId: 'lukas-nelson' },
    { name: 'Benjamin Rice', role: 'engineer' },
    { name: 'Lady Gaga', role: 'producer', artistGlobeId: 'lady-gaga' },
    {
      name: 'Mark Nilan, Jr.',
      role: 'performer',
      artistGlobeId: 'mark-nilan-jr',
    },
    { name: 'Tom Elmhirst', role: 'engineer' },
    { name: 'Lady Gaga', role: 'songwriter', artistGlobeId: 'lady-gaga' },
    { name: 'Nick Monson', role: 'performer', artistGlobeId: 'nick-monson' },
    { name: 'Gary Grant', role: 'performer', instrument: 'trumpet' },
    { name: 'Nick Monson', role: 'producer', artistGlobeId: 'nick-monson' },
    { name: 'Nick Monson', role: 'songwriter', artistGlobeId: 'nick-monson' },
    {
      name: 'Mark Nilan, Jr.',
      role: 'arranger',
      artistGlobeId: 'mark-nilan-jr',
    },
    { name: 'Joel Peskin', role: 'performer', instrument: 'baritone-sax' },
    { name: 'Lady Gaga', role: 'arranger', artistGlobeId: 'lady-gaga' },
    { name: 'Chris Johnson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Lukas Nelson', role: 'songwriter', artistGlobeId: 'lukas-nelson' },
    {
      name: 'Mark Nilan, Jr.',
      role: 'producer',
      artistGlobeId: 'mark-nilan-jr',
    },
    {
      name: 'DJ White Shadow',
      role: 'producer',
      artistGlobeId: 'dj-white-shadow',
    },
    {
      name: 'Aaron Raitiere',
      role: 'songwriter',
      artistGlobeId: 'aaron-raitiere',
    },
    { name: 'Tom Scott', role: 'performer', instrument: 'tenor-sax' },
    {
      name: 'Mark Nilan, Jr.',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'mark-nilan-jr',
    },
    { name: 'Nick Monson', role: 'arranger', artistGlobeId: 'nick-monson' },
    {
      name: 'DJ White Shadow',
      role: 'songwriter',
      artistGlobeId: 'dj-white-shadow',
    },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7/♭7', chordName: 'E7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7/♭7', chordName: 'E7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8uGVZoqJjn4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lady-gaga.webp',
  popularity: 50,
};
