import type { Song } from '@/curriculum/types/songLibrary';

export const dog_days_are_over: Song = {
  id: 'dog_days_are_over',
  title: 'Dog Days Are Over',
  artist: 'Florence and the Machine',
  year: 2008,
  historicalDescription:
    "Florence and the Machine release 'Dog Days Are Over' to international audiences, Florence Welch's soaring vocals and explosive orchestral percussion announcing an entirely new kind of indie rock. The song becomes an anthem of cathartic release, propelling the British band from cult darlings to global stars and establishing Welch as one of the most distinctive voices of her generation.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 150,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'miloco-studios' },
  credits: [
    {
      name: 'Isabella Summers',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'isabella-summers',
    },
    {
      name: 'James Ellis Ford',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'james-ellis-ford',
    },
    {
      name: 'Isabella Summers',
      role: 'producer',
      artistGlobeId: 'isabella-summers',
    },
    { name: 'Ian Burdge', role: 'performer', instrument: 'cello' },
    {
      name: 'Isabella Summers',
      role: 'songwriter',
      artistGlobeId: 'isabella-summers',
    },
    { name: 'Bruce White', role: 'performer', instrument: 'viola' },
    { name: 'Sally Herbert', role: 'performer', instrument: 'violin' },
    { name: 'Jimmy Robertson', role: 'engineer' },
    {
      name: 'Tom Moth',
      role: 'performer',
      instrument: 'harp',
      artistGlobeId: 'tom-moth',
    },
    { name: 'Florence Welch', role: 'vocals', artistGlobeId: 'florence-welch' },
    { name: 'Everton Nelson', role: 'performer', instrument: 'violin' },
    {
      name: 'Christopher Lloyd Hayden',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'christopher-lloyd-hayden',
    },
    {
      name: 'James Ellis Ford',
      role: 'producer',
      artistGlobeId: 'james-ellis-ford',
    },
    {
      name: 'James Ellis Ford',
      role: 'engineer',
      artistGlobeId: 'james-ellis-ford',
    },
    {
      name: 'James Ellis Ford',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'james-ellis-ford',
    },
    {
      name: 'Florence Welch',
      role: 'songwriter',
      artistGlobeId: 'florence-welch',
    },
    {
      name: 'Robert Ackroyd',
      role: 'performer',
      artistGlobeId: 'robert-ackroyd',
    },
  ],
  releases: [{ releaseId: 'florence-and-the-machine-lungs', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        { chords: [], restBars: 32 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [], restBars: 16 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iWOyfLBYtuU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/florence-and-the-machine.webp',
  popularity: 50,
};
