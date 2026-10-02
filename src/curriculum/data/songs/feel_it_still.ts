import type { Song } from '@/curriculum/types/songLibrary';

export const feel_it_still: Song = {
  id: 'feel_it_still',
  title: 'Feel It Still',
  artist: 'Portugal The Man',
  year: 2017,
  historicalDescription:
    "Portugal. The Man releases 'Feel It Still', a swaggering pop-rock anthem built on a looping, vintage groove that catches fire across radio and streaming platforms. The Alaska-rooted band's biggest commercial breakthrough turns an indie act known for prolific underground output into a mainstream household name — proof that counterculture energy and pop instinct can coexist.",
  key: 'D♭ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 160,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'Zachary Scott Carothers',
      role: 'songwriter',
      artistGlobeId: 'zachary-scott-carothers',
    },
    {
      name: 'Robert Bateman',
      role: 'songwriter',
      artistGlobeId: 'robert-bateman',
    },
    {
      name: 'John Baldwin Gourley',
      role: 'songwriter',
      artistGlobeId: 'john-baldwin-gourley',
    },
    { name: 'Kyle O’Quin', role: 'songwriter', artistGlobeId: 'kyle-oquin' },
    { name: 'Eric Howk', role: 'songwriter', artistGlobeId: 'eric-howk' },
    { name: 'John Hill', role: 'songwriter', artistGlobeId: 'john-hill' },
    {
      name: 'Jason Wade Sechrist',
      role: 'songwriter',
      artistGlobeId: 'jason-wade-sechrist',
    },
    {
      name: 'Brian Holland',
      role: 'songwriter',
      artistGlobeId: 'brian-holland',
    },
    {
      name: 'Freddie Gorman',
      role: 'songwriter',
      artistGlobeId: 'freddie-gorman',
    },
    { name: 'Zoe Manville', role: 'songwriter', artistGlobeId: 'zoe-manville' },
    { name: 'Asa Taccone', role: 'songwriter', artistGlobeId: 'asa-taccone' },
  ],
  releases: [{ releaseId: 'portugal-the-man-woodstock', track: 4 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pBkHHoOIIn8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/portugal-the-man.webp',
  popularity: 50,
};
