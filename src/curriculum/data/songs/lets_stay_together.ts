import type { Song } from '@/curriculum/types/songLibrary';

export const lets_stay_together: Song = {
  id: 'lets_stay_together',
  title: 'Let’s Stay Together',
  artist: 'Al Green',
  year: 1971,
  historicalDescription:
    "Al Green records 'Let's Stay Together' in Memphis, delivering one of the most tender and emotionally devastating vocal performances in soul history. The song reaches #1 on the Billboard Hot 100, making Green the defining voice of early 1970s Southern soul — a sensual, spiritual counterpoint to the harder funk sounds emerging from other corners of Black music.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Willie Mitchell',
      role: 'songwriter',
      artistGlobeId: 'willie-mitchell',
    },
    {
      name: 'Al Green',
      role: 'vocals',
      artistGlobeId: 'al-green',
      primary: true,
    },
    { name: 'Wayne Jackson', role: 'performer', instrument: 'trumpet' },
    { name: 'Donna Rhodes', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Sandra Rhodes', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Al Jackson, Jr.',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'al-jackson-jr',
    },
    {
      name: 'Al Jackson, Jr.',
      role: 'songwriter',
      artistGlobeId: 'al-jackson-jr',
    },
    { name: 'Leroy Hodges', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Willie Mitchell',
      role: 'producer',
      artistGlobeId: 'willie-mitchell',
    },
    { name: 'Charles Hodges', role: 'performer', instrument: 'organ' },
    {
      name: 'Charles Chalmers',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Howard Grimes', role: 'performer', instrument: 'drum-kit' },
    { name: 'Mabon Hodges', role: 'performer', artistGlobeId: 'mabon-hodges' },
    { name: 'Charles Hodges', role: 'performer', instrument: 'piano' },
    { name: 'James Mitchell', role: 'performer' },
    { name: 'Al Green', role: 'songwriter', artistGlobeId: 'al-green' },
    { name: 'Ed Logan', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Jack Hale', role: 'performer', instrument: 'trombone' },
  ],
  releases: [{ releaseId: 'al-green-lets-stay-together' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XXx6RDzR6eM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/al-green.webp',
  popularity: 50,
};
