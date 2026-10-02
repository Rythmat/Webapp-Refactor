import type { Song } from '@/curriculum/types/songLibrary';

export const tupelo_honey: Song = {
  id: 'tupelo_honey',
  title: 'Tupelo Honey',
  artist: 'Van Morrison',
  year: 1971,
  historicalDescription:
    "Van Morrison releases 'Tupelo Honey' in 1971, a luminous love song that stands as one of his most tender and unhurried performances. Steeped in Southern soul and Celtic romanticism, it captures Morrison at his most open-hearted — a stark contrast to the cosmic mysticism of 'Astral Weeks'. The song becomes a touchstone for artists seeking to blend rock's raw energy with the warmth of gospel and country.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 70,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Van Morrison', role: 'arranger', artistGlobeId: 'van-morrison' },
    { name: 'Mark Jordon', role: 'performer', instrument: 'piano' },
    { name: 'Ronnie Montrose', role: 'performer', instrument: 'mandolin' },
    { name: 'Garry Malabar', role: 'performer', instrument: 'percussion' },
    {
      name: 'Van Morrison',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'van-morrison',
      primary: true,
    },
    { name: 'Garry Malabar', role: 'performer', instrument: 'vibraphone' },
    { name: 'Doc Storch', role: 'engineer' },
    { name: 'John McFee', role: 'performer', instrument: 'pedal-steel' },
    { name: 'Ted Templeman', role: 'producer', artistGlobeId: 'ted-templeman' },
    { name: 'Janet Planet', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Ellen Schroer', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Jack Schroer', role: 'arranger' },
    {
      name: 'Ted Templeman',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'ted-templeman',
    },
    {
      name: 'Ronnie Montrose',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Van Morrison', role: 'producer', artistGlobeId: 'van-morrison' },
    { name: 'Van Morrison', role: 'songwriter', artistGlobeId: 'van-morrison' },
    { name: 'Jack Schroer', role: 'performer' },
    { name: 'David Brown', role: 'engineer' },
    { name: 'Rolf "Boots" Houston', role: 'performer', instrument: 'flute' },
    { name: 'Bill Church', role: 'performer' },
    {
      name: 'Van Morrison',
      role: 'performer',
      artistGlobeId: 'van-morrison',
      primary: true,
    },
    {
      name: 'Stephen Barncard',
      role: 'engineer',
      artistGlobeId: 'stephen-barncard',
    },
    { name: 'Ronnie Montrose', role: 'performer' },
    { name: 'Luis Gasca', role: 'performer', instrument: 'trumpet' },
    { name: 'Bruce Royston', role: 'performer', instrument: 'flute' },
    {
      name: 'Rolf "Boots" Houston',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Mark Jordon', role: 'performer', instrument: 'electric-piano' },
    { name: 'Connie Kay', role: 'performer', instrument: 'drum-kit' },
    { name: 'Bruce Royston', role: 'arranger' },
  ],
  releases: [{ releaseId: 'van-morrison-tupelo-honey', track: 6 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Dmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3DbTIKHYwog' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/van-morrison.webp',
  popularity: 50,
};
