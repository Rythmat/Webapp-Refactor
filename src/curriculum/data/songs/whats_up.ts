import type { Song } from '@/curriculum/types/songLibrary';

export const whats_up: Song = {
  id: 'whats_up',
  title: 'What’s Up',
  artist: '4 Non Blondes',
  year: 1993,
  historicalDescription:
    "4 Non Blondes release 'What's Up', a raw, anthemic rock track built around Linda Perry's anguished vocal howl and a simple, repeating guitar figure. Emerging from San Francisco's early 90s alternative scene, the song captures a generation's frustration and yearning, becoming an unexpected global hit and one of the most recognizable rock songs of the decade.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 67,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'David Tickle', role: 'engineer', artistGlobeId: 'david-tickle' },
    { name: 'Paul Dieter', role: 'engineer' },
    { name: 'Linda Perry', role: 'vocals', artistGlobeId: 'linda-perry' },
    { name: 'Roger Rocha', role: 'performer', artistGlobeId: 'roger-rocha' },
    {
      name: 'Dawn Richardson',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dawn-richardson',
    },
    { name: 'David Tickle', role: 'producer', artistGlobeId: 'david-tickle' },
    {
      name: 'Linda Perry',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'linda-perry',
    },
    {
      name: 'Linda Perry',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'linda-perry',
    },
    { name: 'Laurent Tardy', role: 'performer', instrument: 'piano' },
    { name: 'Laurent Tardy', role: 'engineer' },
    { name: 'Mark Hensley', role: 'engineer' },
    { name: 'Linda Perry', role: 'songwriter', artistGlobeId: 'linda-perry' },
    {
      name: 'Christa Hillhouse',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'christa-hillhouse',
    },
    {
      name: 'Christa Hillhouse',
      role: 'performer',
      artistGlobeId: 'christa-hillhouse',
    },
    { name: 'Jesse Kanner', role: 'engineer' },
    { name: 'Kent Matcke', role: 'engineer' },
    {
      name: 'Louis Metoyer',
      role: 'performer',
      artistGlobeId: 'louis-metoyer',
    },
  ],
  releases: [
    { releaseId: '4-non-blondes-bigger-better-faster-more', track: 3 },
  ],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6NXnxTNIWkc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/4-non-blondes.webp',
  popularity: 50,
};
