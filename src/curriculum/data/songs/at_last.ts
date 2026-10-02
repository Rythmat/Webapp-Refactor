import type { Song } from '@/curriculum/types/songLibrary';

export const at_last: Song = {
  id: 'at_last',
  title: 'At Last',
  artist: 'Etta James',
  year: 1960,
  historicalDescription:
    "Etta James records 'At Last' in 1960, transforming a 1941 Glenn Miller big band number into an intimate, aching soul ballad. Her voice — raw, powerful, and deeply emotive — strips away the orchestral pageantry and makes the song feel utterly personal. It becomes one of the most enduring vocal performances in American popular music.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 59,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Riley Hampton', role: 'conductor' },
    { name: 'Leonard Chess', role: 'producer', artistGlobeId: 'leonard-chess' },
    { name: 'Riley Hampton Orchestra', role: 'performer', ensemble: true },
    { name: 'Phil Chess', role: 'producer', artistGlobeId: 'phil-chess' },
    { name: 'Harry Warren', role: 'songwriter', artistGlobeId: 'harry-warren' },
    {
      name: 'Etta James',
      role: 'vocals',
      artistGlobeId: 'etta-james',
      primary: true,
    },
    { name: 'Mack Gordon', role: 'songwriter', artistGlobeId: 'mack-gordon' },
    { name: 'Riley Hampton', role: 'arranger' },
    {
      name: 'Leonard & Phil Chess',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'leonard-and-phil-chess',
    },
  ],
  releases: [{ releaseId: 'etta-james-at-last' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Bdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'F/C', beat: 1, duration: 1 },
            { degree: '1 dom7/♭7', chordName: 'F7/E♭', beat: 2, duration: 1 },
            { degree: '6 dom7', chordName: 'D7b9', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'D♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [], fermata: true },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '♭6 dom7', chordName: 'D♭7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
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
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 1 },
            { degree: '♯1 dim7', chordName: 'F♯dim7', beat: 4, duration: 1 },
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
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '1 dom7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '7 dom7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'Amin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '2 dom7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 1 },
            { degree: '♯5 dim7', chordName: 'C♯dim7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '2 dom7', chordName: 'G7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        { chords: [], fermata: true },
        { chords: [], fermata: true },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Bdim7', beat: 1, duration: 1 },
            { degree: '1 maj/5', chordName: 'F/C', beat: 2, duration: 1 },
            { degree: '1 dom7/♭7', chordName: 'F7/E♭', beat: 3, duration: 1 },
            { degree: '6 dom7', chordName: 'D7b9', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'D♭7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 1 },
            { degree: '1 maj/4', chordName: 'F/B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'tag',
      label: 'Tag',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/6', chordName: 'B/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'B/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/6', chordName: 'B/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'D♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1qJU8G7gR_g' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/etta-james.webp',
  popularity: 50,
};
