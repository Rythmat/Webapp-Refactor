import type { Song } from '@/curriculum/types/songLibrary';

export const ill_make_love_to_you: Song = {
  id: 'ill_make_love_to_you',
  title: 'I’ll Make Love To You',
  artist: 'Boyz II Men',
  year: 1994,

  historicalDescription:
    "Boyz II Men release 'I'll Make Love To You', a silky R&B ballad that becomes one of the best-selling singles of all time. The track holds the number one spot on the Billboard Hot 100 for 14 consecutive weeks, cementing the Philadelphia quartet's dominance of 1990s slow-jam culture and setting a commercial benchmark few acts would ever match.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 48,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Brad Gilderman', role: 'engineer' },
    { name: 'Babyface', role: 'songwriter', artistGlobeId: 'babyface' },
    { name: 'Babyface', role: 'producer', artistGlobeId: 'babyface' },
    {
      name: 'Babyface',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'babyface',
    },
    { name: 'Mick Guzauski', role: 'engineer' },
    { name: 'Reggie Hamilton', role: 'performer' },
  ],
  releases: [{ releaseId: 'boyz-ii-men-ii', track: 9 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '♭3 dim7', chordName: 'Fdim7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7/♯1', chordName: 'B7/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7/♯1', chordName: 'B7/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fV8vB1BB2qc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/boyz-ii-men.webp',
  popularity: 50,
};
