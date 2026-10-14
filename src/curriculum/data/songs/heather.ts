import type { Song } from '@/curriculum/types/songLibrary';

export const heather: Song = {
  id: 'heather',
  title: 'Heather',
  artist: 'Conan Gray',
  composer: 'Conan Gray',
  year: 2020,
  historicalDescription:
    "Conan Gray writes 'Heather' alone for his debut album 'Kid Krow', a hushed 12/8 ballad of unrequited love and envy, turned on a single borrowed chord: the B-flat minor that darkens the end of every phrase. Slow-burning rather than an instant hit, it grows on TikTok and streaming into his best-known song, passing two billion streams on Spotify.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 70,
  timeSignature: [12, 8],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Conan Gray',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'conan-gray',
    },
    { name: 'Conan Gray', role: 'songwriter', artistGlobeId: 'conan-gray' },
    { name: 'Dan Nigro', role: 'producer', artistGlobeId: 'dan-nigro' },
  ],
  releases: [{ releaseId: 'conan-gray-kid-krow' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
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
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
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
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '4 min', chordName: 'B♭min', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=24u3NoPvgMw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
