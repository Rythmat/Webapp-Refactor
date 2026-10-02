import type { Song } from '@/curriculum/types/songLibrary';

export const fly_like_an_eagle: Song = {
  id: 'fly_like_an_eagle',
  title: 'Fly Like An Eagle',
  artist: 'Steve Miller Band',
  year: 1976,
  historicalDescription:
    "Steve Miller Band releases 'Fly Like an Eagle' in 1976, a hypnotic, synth-driven track that captures the psychedelic edge of classic rock while reaching far beyond the album-oriented radio crowd. Its dreamlike groove and socially conscious lyrics about poverty and time mark a creative peak for Miller, helping the album of the same name become one of the best-selling records of the year.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'cbs-studios-san-francisco' },
  credits: [
    { name: 'Steve Miller', role: 'vocals', artistGlobeId: 'steve-miller' },
    { name: 'Joachim Young', role: 'performer', instrument: 'hammond-organ' },
    { name: 'Steve Miller', role: 'songwriter', artistGlobeId: 'steve-miller' },
    { name: 'Mike Fusaro', role: 'engineer' },
    { name: 'Steve Miller', role: 'producer', artistGlobeId: 'steve-miller' },
    { name: 'Jim Gaines', role: 'engineer' },
    {
      name: 'Lonnie Turner',
      role: 'performer',
      artistGlobeId: 'lonnie-turner',
    },
    {
      name: 'Gary Mallaber',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'gary-mallaber',
    },
    {
      name: 'Steve Miller',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'steve-miller',
    },
    { name: 'Steve Miller', role: 'performer', artistGlobeId: 'steve-miller' },
  ],
  releases: [{ releaseId: 'steve-miller-band-fly-like-an-eagle' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=WuXwSyahgW4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/steve-miller-band.webp',
  popularity: 50,
};
