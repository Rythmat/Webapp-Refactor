import type { Song } from '@/curriculum/types/songLibrary';

export const where_you_lead: Song = {
  id: 'where_you_lead',
  title: 'Where You Lead',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'Where You Lead' as part of her landmark 1971 album 'Tapestry', a record that redefines the singer-songwriter genre and becomes one of the best-selling albums of all time. The song's warm devotion and intimate feel capture the spirit of a generation turning inward after the upheaval of the 1960s. Decades later, it finds a new audience as the theme song for 'Gilmore Girls', cementing its place in American pop culture.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    { name: 'Toni Stern', role: 'songwriter', artistGlobeId: 'toni-stern' },
    {
      name: 'Danny Kortchmar',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'Merry Clayton', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    { name: 'Russ Kunkel', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    { name: 'Hank Cicalo', role: 'engineer' },
    {
      name: 'Ralph Schuckett',
      role: 'performer',
      instrument: 'electric-piano',
    },
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Charles Larkey', role: 'performer', instrument: 'electric-bass' },
    { name: 'Julia Waters', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'carole-king',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '2 min7/1', chordName: 'Dmin7/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Dmin7/G', beat: 1, duration: 4 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 dom7/5', chordName: 'C7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj/5', chordName: 'F/G', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Dmin7/G', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 dom7/5', chordName: 'C7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj/5', chordName: 'F/G', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 dom7/5', chordName: 'C7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj/5', chordName: 'F/G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'F/C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pFfOsY40SSo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
