import type { Song } from '@/curriculum/types/songLibrary';

export const le_freak: Song = {
  id: 'le_freak',
  title: 'Le Freak',
  artist: 'Chic',
  year: 1978,
  historicalDescription:
    "Chic releases 'Le Freak' in 1978, and it becomes one of the best-selling singles in the history of Atlantic Records. Nile Rodgers and Bernard Edwards craft a groove so tight and infectious it defines the peak of disco's commercial dominance — a moment when the dancefloor is the center of the cultural universe.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Nile Rodgers', role: 'songwriter', artistGlobeId: 'nile-rodgers' },
    {
      name: 'Bernard Edwards',
      role: 'songwriter',
      artistGlobeId: 'bernard-edwards',
    },
  ],
  releases: [{ releaseId: 'chic-cest-chic' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aXgSHL7efKg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/chic.webp',
  popularity: 50,
};
