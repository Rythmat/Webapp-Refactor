import type { Song } from '@/curriculum/types/songLibrary';

export const saving_all_my_love_for_you: Song = {
  id: 'saving_all_my_love_for_you',
  title: 'Saving All My Love For You',
  artist: 'Whitney Houston',
  year: 1985,
  historicalDescription:
    "Whitney Houston releases 'Saving All My Love for You' in 1985, announcing herself to the world with a vocal performance of breathtaking control and emotional depth. The ballad becomes her first number one hit, establishing her as the defining pop voice of a generation. It earns her the Grammy for Best Pop Vocal Performance, Female — the first of many.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 66,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Michael Mancini', role: 'engineer' },
    { name: 'Russell Schmitt', role: 'engineer' },
    { name: 'Tom Scott', role: 'performer' },
    {
      name: 'Michael Masser',
      role: 'songwriter',
      artistGlobeId: 'michael-masser',
    },
    { name: 'Dann Huff', role: 'performer', artistGlobeId: 'dann-huff' },
    { name: 'Oren Waters', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Robbie Buchanan', role: 'performer' },
    { name: 'Maxine Waters', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Nathan East', role: 'performer', instrument: 'electric-bass' },
    { name: 'Bill Schnee', role: 'engineer' },
    { name: 'Julia Waters', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Michael Masser',
      role: 'producer',
      artistGlobeId: 'michael-masser',
    },
    { name: 'Gerry Goffin', role: 'songwriter', artistGlobeId: 'gerry-goffin' },
    {
      name: 'Whitney Houston',
      role: 'vocals',
      artistGlobeId: 'whitney-houston',
      primary: true,
    },
    { name: 'Randy Kerber', role: 'performer' },
    { name: 'Debbie Thomas', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Richard Marx', role: 'performer' },
    { name: 'Paul Jackson, Jr.', role: 'performer' },
    { name: 'Louie Shelton', role: 'performer' },
  ],
  releases: [{ releaseId: 'whitney-houston-whitney-houston', track: 4 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
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
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
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
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '♯4 dom7', chordName: 'D♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ewxmv2tyeRs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/whitney-houston.webp',
  popularity: 50,
};
