import type { Song } from '@/curriculum/types/songLibrary';

export const im_a_believer: Song = {
  id: 'im_a_believer',
  title: 'I’m A Believer',
  artist: 'The Monkees',
  year: 1966,
  historicalDescription:
    "The Monkees release 'I'm A Believer', written by Neil Diamond, and it becomes one of the best-selling singles of 1966. The song captures the buoyant optimism of mid-sixties pop at its peak, propelling the TV-born band beyond their manufactured origins and proving they could deliver genuine hits. It remains one of the best-selling singles of the decade.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 162,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Richard Romoff', role: 'performer' },
    { name: 'Jeff Barry', role: 'producer', artistGlobeId: 'jeff-barry' },
    {
      name: 'Jeff Barry',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jeff-barry',
    },
    { name: 'Neil Diamond', role: 'songwriter', artistGlobeId: 'neil-diamond' },
    { name: 'Jeff Barry', role: 'arranger', artistGlobeId: 'jeff-barry' },
    { name: 'Sal DiTroia', role: 'performer' },
    {
      name: 'Neil Diamond',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'neil-diamond',
    },
    {
      name: 'Davy Jones',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'davy-jones',
    },
    { name: 'Al Gorgoni', role: 'performer' },
    {
      name: 'Peter Tork',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'peter-tork',
    },
    { name: 'Artie Butler', role: 'performer', instrument: 'organ' },
    { name: 'Buddy Salzman', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Jeff Barry',
      role: 'performer',
      instrument: 'tambourine',
      artistGlobeId: 'jeff-barry',
    },
    {
      name: 'Micky Dolenz',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'micky-dolenz',
    },
  ],
  releases: [{ releaseId: 'the-monkees-more-of-the-monkees' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 3 },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5tpxXDILZHs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-monkees.webp',
  popularity: 50,
};
