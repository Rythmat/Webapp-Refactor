import type { Song } from '@/curriculum/types/songLibrary';

export const skin_dijon: Song = {
  id: 'skin_dijon',
  title: 'Skin',
  artist: 'Dijon',
  year: 2018,
  historicalDescription:
    "Dijon releases 'Skin', one of his first solo singles after the duo Abhi//Dijon, a warm, unhurried love song built on a few chords and a lot of space. Its loose, intimate feel, closer to a voice memo than a studio polish, points toward the sound of his 2021 album 'Absolutely' and the indie R&B that follows it.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 95,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    { name: 'Dijon', role: 'vocals', primary: true, artistGlobeId: 'dijon' },
  ],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        "Chord changes are anticipated by an eighth note: they land on the 'and' of 4 and tie over the barline.",
      bars: [
        {
          chords: [
            { degree: '6 min', chordName: 'Emin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Emin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      notes:
        "Chord changes are anticipated by an eighth note: they land on the 'and' of 4 and tie over the barline.",
      bars: [
        {
          chords: [
            { degree: '6 min', chordName: 'Emin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Emin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lFaj0arcZY8' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
