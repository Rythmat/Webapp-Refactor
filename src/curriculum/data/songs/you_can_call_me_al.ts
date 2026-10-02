import type { Song } from '@/curriculum/types/songLibrary';

export const you_can_call_me_al: Song = {
  id: 'you_can_call_me_al',
  title: 'You Can Call Me Al',
  artist: 'Paul Simon',
  year: 1986,
  historicalDescription:
    "Paul Simon releases 'You Can Call Me Al' in 1986, a song that brings the rhythms and textures of South African township music — mbaqanga and township jive — to global pop audiences. The track, anchored by Chevy Chase's comedic appearance in its iconic music video, becomes one of Simon's biggest solo hits and a defining moment of his landmark 'Graceland' period. It sparks both celebration and controversy, opening Western ears to African sounds while igniting debate over cultural appropriation.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'the-hit-factory' },
  credits: [
    { name: 'Paul Simon', role: 'songwriter', artistGlobeId: 'paul-simon' },
    { name: 'Adrian Belew', role: 'performer' },
    { name: 'Ronnie Cuber', role: 'performer', instrument: 'baritone-sax' },
    { name: 'Rob Mounsey', role: 'performer', instrument: 'synthesizer' },
    { name: 'Lew Soloff', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Paul Simon',
      role: 'vocals',
      artistGlobeId: 'paul-simon',
      primary: true,
    },
    { name: 'Isaac Mtshali', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Paul Simon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-simon',
      primary: true,
    },
    { name: 'Bakithi Kumalo', role: 'performer', instrument: 'electric-bass' },
    { name: 'Kim Allan Cissel', role: 'performer', instrument: 'trombone' },
    {
      name: 'Ralph MacDonald',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ralph-macdonald',
    },
    { name: 'Randy Brecker', role: 'performer', instrument: 'trumpet' },
    { name: 'Jon Faddis', role: 'performer', instrument: 'trumpet' },
    { name: 'Ronnie Cuber', role: 'performer' },
    { name: 'Rob Mounsey', role: 'arranger' },
    { name: 'Morris Goldberg', role: 'performer' },
    { name: 'Al Rubin', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Paul Simon',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-simon',
      primary: true,
    },
    { name: 'Paul Simon', role: 'producer', artistGlobeId: 'paul-simon' },
    { name: 'Chikapa “Ray” Phiri', role: 'arranger' },
    { name: 'Dave Bargeron', role: 'performer', instrument: 'trombone' },
    { name: 'Roy Halee', role: 'engineer' },
    { name: 'Chikapa “Ray” Phiri', role: 'performer' },
  ],
  releases: [{ releaseId: 'paul-simon-graceland', track: 6 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uq-gYOrU8bA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/paul-simon.webp',
  popularity: 50,
};
