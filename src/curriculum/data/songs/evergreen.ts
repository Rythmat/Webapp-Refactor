import type { Song } from '@/curriculum/types/songLibrary';

export const evergreen: Song = {
  id: 'evergreen',
  title: "Evergreen (You Didn't Deserve Me at All)",
  artist: 'Omar Apollo',
  composer: 'Omar Apollo, Teo Halm and Manuel Barajas',
  year: 2022,
  historicalDescription:
    "Omar Apollo releases 'Evergreen (You Didn't Deserve Me at All)' on his debut album 'Ivory', a slow 12/8 ballad of heartbreak sung in a soaring falsetto. In September 2022 a snippet goes viral on TikTok and his Tiny Desk performance sends it further, carrying the Mexican-American singer from Indiana onto the Billboard Hot 100 and Rolling Stone's list of the best songs of the year.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 55,
  timeSignature: [12, 8],
  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Omar Apollo',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'omar-apollo',
    },
    { name: 'Omar Apollo', role: 'songwriter', artistGlobeId: 'omar-apollo' },
    { name: 'Teo Halm', role: 'songwriter', artistGlobeId: 'teo-halm' },
    {
      name: 'Manuel Barajas',
      role: 'songwriter',
      artistGlobeId: 'manuel-barajas',
    },
    { name: 'Omar Apollo', role: 'producer', artistGlobeId: 'omar-apollo' },
    { name: 'Teo Halm', role: 'producer', artistGlobeId: 'teo-halm' },
    {
      name: 'Manuel Barajas',
      role: 'producer',
      artistGlobeId: 'manuel-barajas',
    },
  ],
  releases: [{ releaseId: 'omar-apollo-ivory' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 3 },
            { degree: '♭3 dim', chordName: 'Cdim', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
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
            { degree: '1 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 3 },
            { degree: '♭3 dim', chordName: 'Cdim', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
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
            { degree: '1 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 3 },
            { degree: '♭3 dim', chordName: 'Cdim', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
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
            { degree: '1 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 3 },
            { degree: '♭3 dim', chordName: 'Cdim', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min', chordName: 'C♯min', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'G7', beat: 1, duration: 4 },
          ],
          cue: 'Back to the Chorus',
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 3 },
            { degree: '♭3 dim', chordName: 'Cdim', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=gk3G4SLo8k4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
