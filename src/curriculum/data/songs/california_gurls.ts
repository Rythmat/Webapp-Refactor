import type { Song } from '@/curriculum/types/songLibrary';

export const california_gurls: Song = {
  id: 'california_gurls',
  title: 'California Gurls',
  artist: 'Katy Perry',
  year: 2010,
  historicalDescription:
    "Katy Perry releases 'California Gurls' featuring Snoop Dogg, a sun-drenched pop anthem that captures the peak of California's cultural mythology. The track dominates radio in the summer of 2010, cementing Perry's status as a defining pop force of the era and sparking a friendly rivalry with Katy's label-mate's 'California Girls' legacy stretching back to the Beach Boys.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'conway-recording-studios' },
  credits: [
    {
      name: 'Max Martin',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'max-martin',
    },
    { name: 'benny blanco', role: 'producer', artistGlobeId: 'benny-blanco' },
    {
      name: 'Katy Perry',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'katy-perry',
    },
    {
      name: 'Calvin Broadus',
      role: 'songwriter',
      artistGlobeId: 'calvin-broadus',
    },
    { name: 'Dr. Luke', role: 'producer', artistGlobeId: 'dr-luke' },
    {
      name: 'benny blanco',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'benny-blanco',
    },
    { name: 'benny blanco', role: 'songwriter', artistGlobeId: 'benny-blanco' },
    { name: 'benny blanco', role: 'performer', artistGlobeId: 'benny-blanco' },
    { name: 'Emily Wright', role: 'engineer' },
    { name: 'Sam Holland', role: 'engineer' },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dr-luke',
    },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
    { name: 'Bonnie McKee', role: 'songwriter', artistGlobeId: 'bonnie-mckee' },
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Łukasz Gottwald',
      role: 'songwriter',
      artistGlobeId: 'ukasz-gottwald',
    },
    {
      name: 'Snoop Dogg',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'snoop-dogg',
    },
    { name: 'Katy Perry', role: 'songwriter', artistGlobeId: 'katy-perry' },
    { name: 'Dr. Luke', role: 'performer', artistGlobeId: 'dr-luke' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Tamra Natisin', role: 'performer' },
    { name: 'John Hanes', role: 'engineer' },
  ],
  releases: [{ releaseId: 'katy-perry-teenage-dream' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          cue: 'Chords Only',
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          repeatStart: true,
          cue: 'Drums Enter',
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'verse_5',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          cue: 'Bass Enter',
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'chorus_1',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'verse_7',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 4,
    },
    {
      id: 'verse_9',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          cue: 'Bass Enter',
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'chorus_8',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'verse_10',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 4,
    },
    {
      id: 'verse_11',
      label: 'Rap Verse',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 8,
    },
    {
      id: 'verse_12',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Am', beat: 1, duration: 1.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 2.75, duration: 0.75 },
            { degree: '4 maj', chordName: 'B♭', beat: 3.5, duration: 1.5 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8', rest: true, dot: true },
            { value: '16', tie: true },
            { value: '8' },
            { value: '8' },
            { value: '4', rest: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 2.75, duration: 0.75 },
            { degree: '6 min', chordName: 'Dm', beat: 3.5, duration: 1 },
            { degree: '6 min', chordName: 'Dm', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', rest: true },
            { value: '8', dot: true },
            { value: '16' },
            { value: '8', rest: true },
            { value: '8' },
            { value: '8', rest: true },
            { value: '8' },
          ],
          repeatEnd: true,
        },
      ],
      repeatCount: 8,
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=F57P9C4SAW4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/katy-perry.webp',
  popularity: 50,
};
