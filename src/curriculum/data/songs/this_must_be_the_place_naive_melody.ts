import type { Song } from '@/curriculum/types/songLibrary';

export const this_must_be_the_place_naive_melody: Song = {
  id: 'this_must_be_the_place_naive_melody',
  title: 'This Must Be The Place (Naive Melody)',
  artist: 'Talking Heads / Tina Weymouth',
  year: 1983,

  historicalDescription:
    "Talking Heads release 'This Must Be The Place (Naive Melody)', a rare love song from a band better known for anxious, cerebral art-rock. David Byrne's deliberately simple guitar lines — hence the subtitle — give the track a warm, disarming quality that stands apart from the era's edgier new wave. It becomes one of the band's most enduring songs, a gentle emotional anchor in their otherwise restless catalog.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'David Van Tieghem', role: 'performer', instrument: 'percussion' },
    { name: 'Wally Badarou', role: 'performer', instrument: 'synthesizer' },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'David Byrne',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'david-byrne',
    },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'Alex Sadkin', role: 'engineer' },
    { name: 'Butch Jones', role: 'engineer' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'chris-frantz',
    },
  ],
  releases: [{ releaseId: 'talking-heads-speaking-in-tongues', track: 9 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
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
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Fb2q141rMNE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
