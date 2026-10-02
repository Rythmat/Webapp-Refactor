import type { Song } from '@/curriculum/types/songLibrary';

export const smackwater_jack: Song = {
  id: 'smackwater_jack',
  title: 'Smackwater Jack',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King includes 'Smackwater Jack' on her landmark 1971 album Tapestry — a shuffle-rock outlier amid the record's softer confessional songs. Written with Gerry Goffin, the rollicking tale of a trigger-happy outlaw shows King's range as a songwriter, reaching back to the Brill Building storytelling tradition while the rest of Tapestry redefines the singer-songwriter era.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    { name: 'Curtis Amy', role: 'performer', instrument: 'baritone-sax' },
    { name: "Joel O'Brien", role: 'performer', instrument: 'drum-kit' },
    { name: 'Merry Clayton', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Charles Larkey', role: 'performer', instrument: 'electric-bass' },
    { name: 'Julia Waters', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Gerry Goffin', role: 'songwriter', artistGlobeId: 'gerry-goffin' },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    {
      name: 'Danny Kortchmar',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    {
      name: 'Ralph Schuckett',
      role: 'performer',
      instrument: 'electric-piano',
    },
    { name: 'Hank Cicalo', role: 'engineer' },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G/D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4ttfcrg-Yow' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
