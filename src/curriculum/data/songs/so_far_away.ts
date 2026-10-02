import type { Song } from '@/curriculum/types/songLibrary';

export const so_far_away: Song = {
  id: 'so_far_away',
  title: 'So Far Away',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'So Far Away' as part of her landmark album Tapestry, a tender meditation on distance and longing that resonates with a generation navigating change. The song exemplifies the intimate singer-songwriter movement sweeping early 1970s America, where confessional lyrics and understated piano replace the bombast of the previous decade. Tapestry becomes one of the best-selling albums in history, cementing King's transformation from Brill Building hitmaker to iconic solo artist.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Hank Cicalo', role: 'engineer' },
    { name: 'Curtis Amy', role: 'performer', instrument: 'flute' },
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    {
      name: 'James Taylor',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'james-taylor',
    },
    { name: 'Russ Kunkel', role: 'performer', instrument: 'drum-kit' },
    { name: 'Charles Larkey', role: 'performer', instrument: 'electric-bass' },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 4, duration: 1 },
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
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 maj/5', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 4, duration: 1 },
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
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7/5', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UofYl3dataU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
