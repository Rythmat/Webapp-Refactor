import type { Song } from '@/curriculum/types/songLibrary';

export const sober_childish_gambino: Song = {
  id: 'sober_childish_gambino',
  title: 'Sober',
  artist: 'Childish Gambino',
  composer: 'Donald Glover and Ludwig Göransson',
  year: 2014,
  historicalDescription:
    "Childish Gambino releases 'Sober', the lead single from his 'Kauai' EP, a falsetto-led slice of 1980s-tinged pop-funk made with his long-time producer Ludwig Göransson. Its loop of F major 7, D minor 7 and a borrowed E-flat major 7 lifts a whole step to G for the final section, a turn toward the sunnier, groove-first sound Donald Glover explores on 'Awaken, My Love!'.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 98,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['funk', 'rnb'],
  techniques: [],
  credits: [
    {
      name: 'Childish Gambino',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'childish-gambino',
    },
    {
      name: 'Childish Gambino',
      role: 'songwriter',
      artistGlobeId: 'childish-gambino',
    },
    {
      name: 'Ludwig Göransson',
      role: 'songwriter',
      artistGlobeId: 'ludwig-goransson',
    },
    {
      name: 'Childish Gambino',
      role: 'producer',
      artistGlobeId: 'childish-gambino',
    },
    {
      name: 'Ludwig Göransson',
      role: 'producer',
      artistGlobeId: 'ludwig-goransson',
    },
  ],
  releases: [{ releaseId: 'childish-gambino-kauai' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        "Eighth-note chords throughout; E♭ major 7 arrives on the 'and' of 4 and ties over.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      notes:
        "Eighth-note chords throughout; E♭ major 7 arrives on the 'and' of 4 and ties over.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      notes: 'Up a whole step, to G major.',
      bars: [
        {
          keyChange: 'G major',
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jx96Twg-Aew' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
