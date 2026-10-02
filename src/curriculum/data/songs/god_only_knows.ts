import type { Song } from '@/curriculum/types/songLibrary';

export const god_only_knows: Song = {
  id: 'god_only_knows',
  title: 'God Only Knows',
  artist: 'The Beach Boys',
  year: 1966,
  historicalDescription:
    "The Beach Boys release 'God Only Knows' as part of the landmark Pet Sounds album, a song so architecturally ambitious that Paul McCartney calls it the greatest song ever written. Brian Wilson layers orchestral instruments, unusual harmonies, and a tone of aching vulnerability that pushes pop music far beyond the surf and sunshine sound the band is known for. It changes what a pop song is allowed to feel like.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 115,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Carl Wilson', role: 'vocals', artistGlobeId: 'carl-wilson' },
    { name: 'Tony Asher', role: 'songwriter', artistGlobeId: 'tony-asher' },
    { name: 'Jay Migliori', role: 'performer', instrument: 'clarinet' },
    { name: 'Lyle Ritz', role: 'performer', instrument: 'upright-bass' },
    { name: 'Terry Melcher', role: 'performer', instrument: 'tambourine' },
    { name: 'Brian Wilson', role: 'producer', artistGlobeId: 'brian-wilson' },
    { name: 'Jim Horn', role: 'performer', instrument: 'flute' },
    { name: 'Darrel Terwillinger', role: 'performer', instrument: 'viola' },
    { name: 'Leonard Hartman', role: 'performer', instrument: 'clarinet' },
    { name: 'Alan Robinson', role: 'performer', instrument: 'french-horn' },
    { name: 'Carl Fortina', role: 'performer', instrument: 'accordion' },
    { name: 'Brian Wilson', role: 'songwriter', artistGlobeId: 'brian-wilson' },
    { name: 'Hal Blaine', role: 'performer', instrument: 'drum-kit' },
    { name: 'Sid Sharp', role: 'performer', instrument: 'violin' },
    { name: 'Ralph Valentin', role: 'engineer' },
    { name: 'Leonard Hartman', role: 'performer' },
    { name: 'Jim Gordon', role: 'performer', instrument: 'percussion' },
    { name: 'Ray Pohlman', role: 'performer', instrument: 'electric-bass' },
    { name: 'William Green', role: 'performer', instrument: 'flute' },
    { name: 'Chuck Britz', role: 'engineer' },
    { name: 'Larry Knechtel', role: 'performer', instrument: 'harpsichord' },
    { name: 'Don Randi', role: 'performer' },
    { name: 'Frank Marocco', role: 'performer', instrument: 'accordion' },
    { name: 'Brian Wilson', role: 'arranger', artistGlobeId: 'brian-wilson' },
    { name: 'Hal Blaine', role: 'performer' },
    { name: 'Jesse Erlich', role: 'performer', instrument: 'cello' },
    { name: 'Bruce Johnston', role: 'vocals', artistGlobeId: 'bruce-johnston' },
    { name: 'Brian Wilson', role: 'vocals', artistGlobeId: 'brian-wilson' },
    { name: 'Carol Kaye', role: 'performer' },
    { name: 'Leonard Malarsky', role: 'performer', instrument: 'violin' },
  ],
  releases: [{ releaseId: 'the-beach-boys-pet-sounds' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 3 },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '5 maj/2', chordName: 'B/F♯', beat: 2, duration: 1 },
            { degree: '♭6 maj/♭3', chordName: 'C/G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '2 maj', chordName: 'F♯', beat: 2, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      instrumental: true,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj/1', chordName: 'A/E', beat: 3, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '♭3 maj/♭7', chordName: 'G/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/2', chordName: 'Bmin7/F♯', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'E/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dim7', chordName: 'Fdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'A/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dim7', chordName: 'Cdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NADx3-qRxek' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beach-boys.webp',
  popularity: 50,
};
