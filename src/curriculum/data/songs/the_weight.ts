import type { Song } from '@/curriculum/types/songLibrary';

export const the_weight: Song = {
  id: 'the_weight',
  title: 'The Weight',
  artist: 'The Band',
  year: 1996,
  historicalDescription:
    "The Band's 'The Weight' stands as one of the defining documents of Americana — a song so steeped in Southern mythology and communal storytelling that it seems to have always existed. Written by Robbie Robertson and rooted in the weight of human obligation, it captures the group's uncanny ability to sound ancient and immediate at once. Its chorus, shared between multiple voices, embodies the Band's philosophy: no single star, just the song.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 73,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'rock'],
  techniques: [],
  session: { studioId: 'a-r-recording-studio-1958-1989' },
  credits: [
    { name: 'Levon Helm', role: 'vocals', artistGlobeId: 'levon-helm' },
    { name: 'John Simon', role: 'producer', artistGlobeId: 'john-simon' },
    { name: 'Don Hahn', role: 'engineer' },
    {
      name: 'Garth Hudson',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'garth-hudson',
    },
    {
      name: 'The Band',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-band',
    },
    {
      name: 'Levon Helm',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'levon-helm',
    },
    {
      name: 'Richard Manuel',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'richard-manuel',
    },
    {
      name: 'Rick Danko',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'rick-danko',
    },
    {
      name: 'Robbie Robertson',
      role: 'songwriter',
      artistGlobeId: 'robbie-robertson',
    },
    {
      name: 'Rick Danko',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'rick-danko',
    },
    {
      name: 'Robbie Robertson',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'robbie-robertson',
    },
    {
      name: 'Levon Helm',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'levon-helm',
    },
    { name: 'Rick Danko', role: 'vocals', artistGlobeId: 'rick-danko' },
    { name: 'Tony May', role: 'engineer' },
  ],
  releases: [{ releaseId: 'the-band-music-from-big-pink' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=xLFAQuWFcTo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-band.webp',
  popularity: 50,
};
