import type { Song } from '@/curriculum/types/songLibrary';

export const give_me_back_my_name: Song = {
  id: 'give_me_back_my_name',
  title: 'Give Me Back My Name',
  artist: 'Talking Heads',
  year: 1985,
  historicalDescription:
    "Talking Heads release 'Give Me Back My Name' from their landmark album 'Little Creatures', a deliberate step back from the sprawling Afrobeat-influenced productions of their earlier work. David Byrne's lyrical anxiety finds a more intimate, American folk-rock setting — marking a quieter but no less compelling chapter in the band's restless reinvention.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'sigma-sound-studios' },
  credits: [
    { name: 'Eric Thorngren', role: 'engineer' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
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
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'Tina Weymouth', role: 'arranger', artistGlobeId: 'tina-weymouth' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'Chris Frantz', role: 'arranger', artistGlobeId: 'chris-frantz' },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    {
      name: 'Jerry Harrison',
      role: 'arranger',
      artistGlobeId: 'jerry-harrison',
    },
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
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
  ],
  releases: [{ releaseId: 'talking-heads-little-creatures', track: 2 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          keyChange: 'C♯ minor',
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
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
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
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
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
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
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          keyChange: 'D major',
        },
        {
          chords: [
            { degree: '♭2 maj/♭6', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          keyChange: 'C♯ minor',
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
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
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          keyChange: 'D major',
        },
        {
          chords: [
            { degree: '♭2 maj/♭6', chordName: 'E♭/B♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=J-Oag4UAz_Y' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
