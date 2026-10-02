import type { Song } from '@/curriculum/types/songLibrary';

export const takin_care_of_business: Song = {
  id: 'takin_care_of_business',
  title: 'Takin’ Care Of Business',
  artist: 'Bachman-Turner Overdrive',
  year: 1973,
  historicalDescription:
    "Bachman-Turner Overdrive release 'Takin' Care Of Business' in 1973, a hard-driving anthem built on a relentless guitar riff that becomes one of rock's most recognizable grooves. The Canadian band channels blue-collar swagger into a song that captures the working-man spirit of the era — embedding itself permanently in sports arenas, radio playlists, and popular culture.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 127,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'kaye-smith-studios' },
  credits: [
    { name: 'Norman Durkee', role: 'performer', instrument: 'piano' },
    {
      name: 'Robbie Bachman',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'robbie-bachman',
    },
    {
      name: 'Robbie Bachman',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'robbie-bachman',
    },
    { name: 'Randy Bachman', role: 'producer', artistGlobeId: 'randy-bachman' },
    {
      name: 'Randy Bachman',
      role: 'songwriter',
      artistGlobeId: 'randy-bachman',
    },
    { name: 'Randy Bachman', role: 'vocals', artistGlobeId: 'randy-bachman' },
    { name: 'Tim Bachman', role: 'performer', artistGlobeId: 'tim-bachman' },
    {
      name: 'Randy Bachman',
      role: 'performer',
      artistGlobeId: 'randy-bachman',
    },
    {
      name: 'Randy Bachman',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'randy-bachman',
    },
    { name: 'Buzz Richmond', role: 'engineer' },
    {
      name: 'C.F. “Fred” Turner',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'c-f-fred-turner',
    },
    {
      name: 'C.F. “Fred” Turner',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'c-f-fred-turner',
    },
    {
      name: 'Tim Bachman',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tim-bachman',
    },
  ],
  releases: [
    { releaseId: 'bachman-turner-overdrive-bachman-turner-overdrive-ii' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [], restBars: 6 },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [], restBars: 10 },
        { chords: [] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=0y-_WGjZgD8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bachman-turner-overdrive.webp',
  popularity: 50,
};
