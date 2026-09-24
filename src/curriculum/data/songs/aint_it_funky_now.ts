import type { Song } from '@/curriculum/types/songLibrary';

export const aint_it_funky_now: Song = {
  id: 'aint_it_funky_now',
  title: 'Ain’t It Funky Now',
  artist: 'Grant Green',
  year: 2005,
  historicalDescription:
    "Grant Green's 'Ain't It Funky Now' captures the guitarist's signature blend of jazz precision and deep soul groove, sitting comfortably in the tradition of organ-combo funk that Green championed throughout his career. Though released posthumously in 2005, the track embodies the raw, street-level funk aesthetic that made Green a beloved figure in soul-jazz circles and a cornerstone of hip-hop sampling culture.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'jazz', 'rnb'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=GLBTSrD42QY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/grant-green.webp',
  popularity: 50,
};
