import type { Song } from '@/curriculum/types/songLibrary';

export const love_never_felt_so_good: Song = {
  id: 'love_never_felt_so_good',
  title: 'Love Never Felt So Good',
  artist: 'Michael Jackson and Justin Timberlake',
  year: 2014,

  historicalDescription:
    "A posthumous Michael Jackson recording featuring Justin Timberlake, 'Love Never Felt So Good' surfaces decades after its original demo was laid down, reminding the world of Jackson's effortless pop instinct. The collaboration bridges generations, pairing Jackson's timeless groove with Timberlake's modern vocal presence — a bittersweet reminder of what the King of Pop left behind.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 117,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Paul Anka', role: 'songwriter', artistGlobeId: 'paul-anka' },
    { name: 'Adam Blackstone', role: 'performer' },
    {
      name: 'Michael Jackson',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Michael Jackson',
      role: 'songwriter',
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Justin Timberlake',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Dan Warner', role: 'performer' },
  ],
  releases: [{ releaseId: 'michael-jackson-xscape', track: 17 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 7 },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭7 maj/1', chordName: 'E♭/F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 dom7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E♭', beat: 3, duration: 1 },
            { degree: '♭7 maj/1', chordName: 'E♭/F', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 dom7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Fmin7', beat: 2, duration: 1 },
            { degree: '♭2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/♭3', chordName: 'G♭/A♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '♭7 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oG08ukJPtR8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
