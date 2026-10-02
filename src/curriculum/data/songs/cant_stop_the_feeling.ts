import type { Song } from '@/curriculum/types/songLibrary';

export const cant_stop_the_feeling: Song = {
  id: 'cant_stop_the_feeling',
  title: 'Can’t Stop The Feeling',
  artist: 'Justin Timberlake',
  year: 2016,
  historicalDescription:
    "Justin Timberlake releases 'Can't Stop The Feeling' in 2016 as the lead single from the Trolls soundtrack, a euphoric blast of funk-pop sunshine that becomes one of the year's defining feel-good anthems. Its irresistible groove bridges the gap between 70s disco, R&B, and mainstream pop, earning Timberlake his first Billboard Hot 100 number one as a solo artist. The song demonstrates his enduring ability to bottle pure, uncomplicated joy into a three-minute hit.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'studio-willow-valley' },
  credits: [
    { name: 'Wojtek Goral', role: 'performer' },
    { name: 'Mattias Bylund', role: 'arranger' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Shellback', role: 'performer', artistGlobeId: 'shellback' },
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
    { name: 'Peter Noos Johansson', role: 'performer', instrument: 'trombone' },
    { name: 'Elliott Ives', role: 'performer' },
    { name: 'Noah Passovoy', role: 'engineer' },
    { name: 'Mattias Bylund', role: 'performer', instrument: 'french-horn' },
    {
      name: 'Max Martin',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'max-martin',
    },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'shellback',
    },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Justin Timberlake',
      role: 'producer',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'Wojtek Goral', role: 'arranger' },
    { name: 'John Hanes', role: 'engineer' },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'shellback',
    },
    { name: 'Mattias Bylund', role: 'engineer' },
    {
      name: 'Justin Timberlake',
      role: 'songwriter',
      artistGlobeId: 'justin-timberlake',
    },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'shellback',
    },
    { name: 'Shellback', role: 'songwriter', artistGlobeId: 'shellback' },
    {
      name: 'Justin Timberlake',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'justin-timberlake',
      primary: true,
    },
    { name: 'Janne Bierger', role: 'performer', instrument: 'trumpet' },
    { name: 'Shellback', role: 'producer', artistGlobeId: 'shellback' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ru0K8uYEZWw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/justin-timberlake.webp',
  popularity: 50,
};
