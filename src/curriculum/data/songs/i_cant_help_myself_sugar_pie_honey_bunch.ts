import type { Song } from '@/curriculum/types/songLibrary';

export const i_cant_help_myself_sugar_pie_honey_bunch: Song = {
  id: 'i_cant_help_myself_sugar_pie_honey_bunch',
  title: 'I Can’t Help Myself (Sugar Pie, Honey Bunch)',
  artist: 'Four Tops',
  year: 1965,
  historicalDescription:
    "The Four Tops release 'I Can't Help Myself (Sugar Pie, Honey Bunch)', a propulsive Motown anthem that shoots to #1 and becomes one of the label's signature sounds. Levi Stubbs' raw, urgent lead vocal — desperate and joyful at once — sets the Four Tops apart from their Motown peers. The song cements Detroit's grip on popular music in 1965.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'hitsville' },
  credits: [
    {
      name: 'The Andantes',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    { name: 'Russ Terrana', role: 'engineer' },
    { name: 'James Jamerson', role: 'performer' },
    { name: 'Jackie Hicks', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Levi Stubbs', role: 'vocals', artistGlobeId: 'levi-stubbs' },
    {
      name: 'Abdul “Duke” Fakir',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'abdul-duke-fakir',
    },
    {
      name: 'Detroit Symphony Orchestra',
      role: 'performer',
      instrument: 'string-section',
      ensemble: true,
    },
    { name: 'Louvain Demps', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Earl Van Dyke', role: 'performer', instrument: 'piano' },
    { name: 'Joe Messina', role: 'performer' },
    {
      name: 'Lamont Dozier',
      role: 'songwriter',
      artistGlobeId: 'lamont-dozier',
    },
    {
      name: 'Eddie Holland',
      role: 'songwriter',
      artistGlobeId: 'eddie-holland',
    },
    { name: 'Brian Holland', role: 'producer', artistGlobeId: 'brian-holland' },
    { name: 'Lamont Dozier', role: 'producer', artistGlobeId: 'lamont-dozier' },
    {
      name: 'Andrew “Mike” Terry',
      role: 'performer',
      instrument: 'baritone-sax',
    },
    { name: 'Jack Ashford', role: 'performer', instrument: 'tambourine' },
    {
      name: 'Brian Holland',
      role: 'songwriter',
      artistGlobeId: 'brian-holland',
    },
    { name: 'Marlene Barrow', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Eddie Willis', role: 'performer' },
    {
      name: 'Renaldo Benson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'renaldo-benson',
    },
    { name: 'Robert White', role: 'performer' },
    {
      name: 'Richard "Pistol" Allen',
      role: 'performer',
      instrument: 'drum-kit',
    },
    {
      name: 'Lawrence Payton',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'lawrence-payton',
    },
    { name: 'Jack Brokensha', role: 'performer', instrument: 'vibraphone' },
    { name: 'The Funk Brothers', role: 'performer', ensemble: true },
  ],
  releases: [{ releaseId: 'four-tops-second-album' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=s3bksUSPB4c' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/four-tops.webp',
  popularity: 50,
};
