import type { Song } from '@/curriculum/types/songLibrary';

export const give_it_to_me_baby: Song = {
  id: 'give_it_to_me_baby',
  title: 'Give It To Me Baby',
  artist: 'Rick James',
  year: 1981,
  historicalDescription:
    "Rick James releases 'Give It To Me Baby' in 1981, a strutting funk anthem that becomes one of his signature tracks. Its insistent groove and James's raw, seductive delivery cement his reputation as the undisputed king of street funk — a sound that bridges the classic funk of the 1970s with the synth-driven R&B era just around the corner.",
  key: 'C♯ dorian',
  keyRoot: 61,
  mode: 'dorian',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Fernando Harkless', role: 'performer', instrument: 'trumpet' },
    { name: 'Teena Marie', role: 'performer', instrument: 'handclaps' },
    { name: 'Cliff Ervin', role: 'performer', instrument: 'trumpet' },
    { name: 'Oscar Alston', role: 'performer', instrument: 'percussion' },
    { name: 'Levi Ruffin, Jr.', role: 'performer', instrument: 'synthesizer' },
    { name: 'Daniel LeMelle', role: 'performer' },
    { name: 'Lanise Hughes', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Levi Ruffin, Jr.',
      role: 'performer',
      instrument: 'electric-piano',
    },
    { name: 'Rick James', role: 'producer', artistGlobeId: 'rick-james' },
    { name: 'Teena Marie', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Tom McDermott', role: 'performer', instrument: 'percussion' },
    { name: 'John Ervin', role: 'performer', instrument: 'trombone' },
    { name: 'Rick James', role: 'songwriter', artistGlobeId: 'rick-james' },
    { name: 'Tom McDermott', role: 'performer' },
    {
      name: 'Melvin Franklin',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'melvin-franklin',
    },
    { name: 'Roy Poper', role: 'performer', instrument: 'trumpet' },
    { name: 'Bobby Brooks', role: 'engineer' },
    { name: 'Oscar Alston', role: 'performer' },
    { name: 'Tom Flye', role: 'engineer' },
    { name: 'Rick Sanchez', role: 'engineer' },
    {
      name: 'Rick James',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'rick-james',
      primary: true,
    },
    { name: 'Rick James', role: 'arranger', artistGlobeId: 'rick-james' },
  ],
  releases: [{ releaseId: 'rick-james-street-songs' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
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
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
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
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
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
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1dNIQVYGXbM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rick-james.webp',
  popularity: 50,
};
