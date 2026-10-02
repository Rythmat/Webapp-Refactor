import type { Song } from '@/curriculum/types/songLibrary';

export const treasure: Song = {
  id: 'treasure',
  title: 'Treasure',
  artist: 'Bruno Mars',
  year: 2012,
  historicalDescription:
    "Bruno Mars releases 'Treasure', a sun-drenched funk and pop throwback that channels the euphoric groove of 1980s acts like Earth, Wind & Fire and Kool & the Gang. At a moment when electronic production dominates pop radio, Mars doubles down on live-band energy and irresistible hooks — proving that classic soul and funk can still conquer the charts.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Ari Levine', role: 'songwriter', artistGlobeId: 'ari-levine' },
    { name: 'Ari Levine', role: 'engineer', artistGlobeId: 'ari-levine' },
    { name: 'Breakbot', role: 'songwriter', artistGlobeId: 'breakbot' },
    { name: 'Manny Marroquin', role: 'engineer' },
    { name: 'Bruno Mars', role: 'songwriter', artistGlobeId: 'bruno-mars' },
    { name: 'Charles Moniz', role: 'engineer' },
    {
      name: 'Christopher Irfane Khan-Acito',
      role: 'songwriter',
      artistGlobeId: 'christopher-irfane-khan-acito',
    },
    {
      name: 'Bruno Mars',
      role: 'vocals',
      artistGlobeId: 'bruno-mars',
      primary: true,
    },
    {
      name: 'The Smeezingtons',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-smeezingtons',
    },
    {
      name: 'Philip Lawrence',
      role: 'songwriter',
      artistGlobeId: 'philip-lawrence',
    },
    {
      name: 'Phredley Brown',
      role: 'songwriter',
      artistGlobeId: 'phredley-brown',
    },
  ],
  releases: [{ releaseId: 'bruno-mars-unorthodox-jukebox', track: 4 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nPvuNsRccVw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bruno-mars.webp',
  popularity: 50,
};
