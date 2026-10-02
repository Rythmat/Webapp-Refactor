import type { Song } from '@/curriculum/types/songLibrary';

export const modern_love: Song = {
  id: 'modern_love',
  title: 'Modern Love',
  artist: 'David Bowie',
  year: 1983,
  historicalDescription:
    "David Bowie releases 'Modern Love' as the opening track and lead single from his blockbuster album 'Let's Dance', marking a dramatic shift from his avant-garde Berlin Trilogy toward a sleek, radio-ready pop-rock sound. The song's driving rhythm and gospel-tinged energy capture Bowie at his most commercially triumphant — skeptical of romance and religion yet irresistibly danceable. It becomes one of the defining anthems of early 1980s pop.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 180,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'power-station-at-berkleenyc' },
  credits: [
    { name: 'Nile Rodgers', role: 'performer', artistGlobeId: 'nile-rodgers' },
    { name: 'Steve Elson', role: 'performer', instrument: 'flute' },
    { name: 'Sammy Figueroa', role: 'performer', instrument: 'percussion' },
    {
      name: 'David Bowie',
      role: 'vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    { name: 'David Spinner', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Carmine Rojas', role: 'performer' },
    { name: 'David Bowie', role: 'producer', artistGlobeId: 'david-bowie' },
    { name: 'Stan Harrison', role: 'performer', instrument: 'flute' },
    { name: 'Rob Sabino', role: 'performer' },
    { name: 'Stan Harrison', role: 'performer', instrument: 'tenor-sax' },
    { name: 'George Simms', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Omar Hakim', role: 'performer', instrument: 'drum-kit' },
    { name: 'Mac Gollehon', role: 'performer', instrument: 'trumpet' },
    { name: 'Bob Clearmountain', role: 'engineer' },
    { name: 'David Bowie', role: 'songwriter', artistGlobeId: 'david-bowie' },
    { name: 'Frank Simms', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Robert Aaron', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Nile Rodgers', role: 'producer', artistGlobeId: 'nile-rodgers' },
    { name: 'Robert Aaron', role: 'performer', instrument: 'flute' },
    { name: 'Steve Elson', role: 'performer', instrument: 'baritone-sax' },
    {
      name: 'Stevie Ray Vaughan',
      role: 'performer',
      artistGlobeId: 'stevie-ray-vaughan',
    },
  ],
  releases: [{ releaseId: 'david-bowie-lets-dance' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'D/C', beat: 1, duration: 2 },
            { degree: '♭6 dom7', chordName: 'C7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
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
            { degree: '♭7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭6', chordName: 'D/C', beat: 1, duration: 2 },
            { degree: '♭6 dom7', chordName: 'C7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
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
            { degree: '♭7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E7sus', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HivQqTtiHVw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
