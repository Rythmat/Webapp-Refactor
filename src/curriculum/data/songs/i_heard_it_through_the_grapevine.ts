import type { Song } from '@/curriculum/types/songLibrary';

export const i_heard_it_through_the_grapevine: Song = {
  id: 'i_heard_it_through_the_grapevine',
  title: 'I Heard It Through The Grapevine',
  artist: 'Marvin Gaye',
  year: 1968,
  historicalDescription:
    "Marvin Gaye releases 'I Heard It Through The Grapevine' in 1968, a song Motown had shelved for over a year despite earlier versions by Gladys Knight and Smokey Robinson. Its brooding, hypnotic groove marks a turning point — darker and more emotionally raw than the polished Motown formula — and it becomes one of the best-selling singles in the label's history.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'hitsville' },
  credits: [
    { name: 'Earl Van Dyke', role: 'performer', instrument: 'hammond-organ' },
    { name: 'Richard "Pistol" Allen', role: 'performer' },
    { name: 'Eddie Willis', role: 'performer' },
    { name: 'Jackie Hicks', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Marvin Gaye',
      role: 'vocals',
      artistGlobeId: 'marvin-gaye',
      primary: true,
    },
    {
      name: 'Norman Whitfield',
      role: 'producer',
      artistGlobeId: 'norman-whitfield',
    },
    { name: 'James Jamerson', role: 'performer' },
    { name: 'Joe Messina', role: 'performer' },
    { name: 'Jack Ashford', role: 'performer', instrument: 'congas' },
    {
      name: 'Norman Whitfield',
      role: 'songwriter',
      artistGlobeId: 'norman-whitfield',
    },
    { name: 'Jack Ashford', role: 'performer', instrument: 'tambourine' },
    { name: 'The Funk Brothers', role: 'performer', ensemble: true },
    { name: 'Marlene Barrow', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Detroit Symphony Orchestra', role: 'performer', ensemble: true },
    { name: 'Edwin Jones', role: 'performer', instrument: 'french-horn' },
    { name: 'Paul Riser', role: 'arranger' },
    { name: 'Louvain Demps', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'The Andantes',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    { name: 'Johnny Griffith', role: 'performer', instrument: 'wurlitzer' },
    {
      name: 'Barrett Strong',
      role: 'songwriter',
      artistGlobeId: 'barrett-strong',
    },
    { name: 'Donald Ozga', role: 'performer', instrument: 'french-horn' },
    { name: 'Uriel Jones', role: 'performer', instrument: 'drum-kit' },
  ],
  releases: [{ releaseId: 'marvin-gaye-in-the-groove' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 9 },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7/1', chordName: 'Cmin7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7/1', chordName: 'Cmin7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=VWG3npfEoHo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/marvin-gaye.webp',
  popularity: 50,
};
