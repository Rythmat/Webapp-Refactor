import type { Song } from '@/curriculum/types/songLibrary';

export const ordinary_pain: Song = {
  id: 'ordinary_pain',
  title: 'Ordinary Pain',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Ordinary Pain' as part of his landmark double album 'Songs in the Key of Life' — a sprawling masterpiece that cements his status as one of popular music's greatest auteurs. The track features a rare vocal duet structure, with Shirley Brewer delivering a sharp rebuttal verse that transforms the song into a dialogue about heartbreak. It captures Wonder at the height of his creative powers, weaving funk, soul, and emotional complexity into something wholly his own.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 98,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Charity McCrary',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'synth-bass',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Sundray Tucker', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Madelaine "Gypsie" Jones',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Terry Hendricks',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Linda McCrary', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    { name: 'Shirley Brewer', role: 'vocals' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    {
      name: 'Syreeta',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'syreeta',
    },
    {
      name: 'Mary Lee Whitney',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Michael Sembello',
      role: 'performer',
      artistGlobeId: 'michael-sembello',
    },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Lynda Laurence', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Hank Redd', role: 'performer', instrument: 'alto-sax' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'fender-rhodes',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Deniece Williams',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'deniece-williams',
    },
    {
      name: 'Minnie Riperton',
      role: 'performer',
      instrument: 'backing-vocals',
    },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F7', beat: 3, duration: 2 },
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
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F7', beat: 3, duration: 2 },
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
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F7', beat: 3, duration: 2 },
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
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=se0g2f5Ub0A' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
