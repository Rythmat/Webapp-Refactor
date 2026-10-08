import type { Song } from '@/curriculum/types/songLibrary';

export const we_shall_overcome: Song = {
  id: 'we_shall_overcome',
  title: 'We Shall Overcome',
  artist: 'Joan Baez',
  composer:
    'Charles Albert Tindley; adapted by Zilphia Horton, Frank Hamilton, Guy Carawan and Pete Seeger',
  year: 1963,
  historicalDescription:
    "'We Shall Overcome' grows out of 'I'll Overcome Someday', a hymn by the Philadelphia minister Charles Albert Tindley, reshaped over half a century by Black congregations, striking tobacco workers and the Highlander Folk School into the anthem of the Civil Rights Movement. In May 1963 Joan Baez sings it at Miles College in Birmingham, Alabama, before a racially mixed audience on the day of mass arrests of young demonstrators, and the recording on 'Joan Baez in Concert, Part 2' carries it to a national folk audience. Three months later she sings at the March on Washington.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['folk'],
  techniques: [],
  credits: [
    {
      name: 'Joan Baez',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'joan-baez',
    },
    {
      name: 'Joan Baez',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'joan-baez',
    },
    { name: 'Charles Albert Tindley', role: 'songwriter' },
    { name: 'Zilphia Horton', role: 'songwriter' },
    { name: 'Frank Hamilton', role: 'songwriter' },
    { name: 'Guy Carawan', role: 'songwriter' },
    { name: 'Pete Seeger', role: 'songwriter', artistGlobeId: 'pete-seeger' },
  ],
  releases: [{ releaseId: 'joan-baez-in-concert-part-2' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'Amin', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'Amin', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          repeatEnd: true,
          cue: 'Repeat for each verse',
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          fermata: true,
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=7akuOFp-ET8' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
