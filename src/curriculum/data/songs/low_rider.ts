import type { Song } from '@/curriculum/types/songLibrary';

export const low_rider: Song = {
  id: 'low_rider',
  title: 'Low Rider',
  artist: 'War',
  year: 1976,
  historicalDescription:
    "War releases 'Low Rider', a slow-burning funk groove that becomes an anthem for Chicano car culture in Los Angeles. The band — a multiracial collective from Long Beach — captures the laid-back pride of lowrider culture with a sound that is equal parts funk, Latin soul, and street poetry. It becomes one of the defining crossover hits of the decade.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 142,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BsrqKE1iqqo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/war.webp',
  popularity: 50,
};
