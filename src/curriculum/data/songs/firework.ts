import type { Song } from '@/curriculum/types/songLibrary';

export const firework: Song = {
  id: 'firework',
  title: 'Firework',
  artist: 'Katy Perry',
  year: 2010,
  historicalDescription:
    "Katy Perry releases 'Firework', an anthemic pop-rock ballad that becomes one of the defining empowerment songs of its era. With its soaring chorus and message of self-worth, it resonates with millions of listeners worldwide — cementing Perry's status as one of pop's biggest voices at the height of her commercial dominance in the early 2010s.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'roc-the-mic-studios' },
  credits: [
    { name: 'Carlos Oyanedel', role: 'engineer' },
    { name: 'Ester Dean', role: 'songwriter', artistGlobeId: 'ester-dean' },
    { name: 'Sandy Vee', role: 'producer', artistGlobeId: 'sandy-vee' },
    {
      name: 'Tor Erik Hermansen',
      role: 'songwriter',
      artistGlobeId: 'tor-erik-hermansen',
    },
    {
      name: 'StarGate',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'stargate',
    },
    {
      name: 'Katy Perry',
      role: 'vocals',
      artistGlobeId: 'katy-perry',
      primary: true,
    },
    { name: 'Katy Perry', role: 'songwriter', artistGlobeId: 'katy-perry' },
    { name: 'Erik Hermansen', role: 'performer' },
    { name: 'Miles Walker', role: 'engineer' },
    {
      name: 'Sandy Wilhelm',
      role: 'songwriter',
      artistGlobeId: 'sandy-wilhelm',
    },
    {
      name: 'Mikkel Storleer Eriksen',
      role: 'songwriter',
      artistGlobeId: 'mikkel-storleer-eriksen',
    },
    {
      name: 'Mikkel Storleer Eriksen',
      role: 'engineer',
      artistGlobeId: 'mikkel-storleer-eriksen',
    },
    {
      name: 'Mikkel Storleer Eriksen',
      role: 'performer',
      artistGlobeId: 'mikkel-storleer-eriksen',
    },
    { name: 'Sandy Vee', role: 'performer', artistGlobeId: 'sandy-vee' },
    { name: 'Damien Lewis', role: 'engineer' },
    { name: 'Phil Tan', role: 'engineer' },
    { name: 'Sandy Vee', role: 'engineer', artistGlobeId: 'sandy-vee' },
  ],
  releases: [{ releaseId: 'katy-perry-teenage-dream' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [] },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=QGJuMBdaqIw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/katy-perry.webp',
  popularity: 50,
};
