import type { FundamentalsFlow } from '../../types/fundamentals';

export const pianoFundamentalsFlow: FundamentalsFlow = {
  title: 'Piano Fundamentals',
  sections: [
    // ── Section 1: Layout of the Keyboard ──────────────────────────
    {
      id: '1',
      name: 'Layout of the Keyboard',
      textPrompt:
        'The piano is a repeating pattern of white and black keys. As you go to the right, notes sound higher. As you go to the left, notes sound lower.',
      steps: [
        {
          stepNumber: 1,
          id: '1.1a',
          activity: 'Explore High and Low',
          direction:
            'Play any key on the right side of the keyboard. Now play any key on the left side. Hear the difference?',
          assessment: 'pass_proceed',
          midiCriteria: 'Any note MIDI 60+ followed by any note MIDI < 60',
          midiEval: {
            type: 'two_range_sequence',
            first: { min: 60, max: 127 },
            second: { min: 0, max: 59 },
          },
          successFeedback:
            "Higher notes are to the right, lower notes are to the left. That's true for every keyboard instrument!",
          tag: 'piano_fund:high_low | fundamentals',
          visual: 'Full keyboard displayed on screen.',
        },
        {
          stepNumber: 2,
          id: '1.2a',
          activity: 'Find the Groups of Two',
          direction:
            'Find and play the first note in every group of TWO black keys you can find.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays C#/Db in any octave. Pass when 3+ groups found.',
          midiEval: { type: 'pitch_class', notes: [1], minOctaves: 3 },
          successFeedback: 'Great! You found the groups of two black keys.',
          tag: 'piano_fund:black_key_groups_2 | fundamentals',
          visual:
            'Groups of 2 black keys highlighted. First key in each group pulsing.',
        },
        {
          stepNumber: 3,
          id: '1.2b',
          activity: 'Find the Groups of Three',
          direction:
            'Now find and play the first note in every group of THREE black keys.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays F#/Gb in any octave. Pass when 3+ groups found.',
          midiEval: { type: 'pitch_class', notes: [6], minOctaves: 3 },
          successFeedback:
            "You found them! Groups of two and groups of three -- that's the whole pattern of the piano.",
          tag: 'piano_fund:black_key_groups_3 | fundamentals',
          visual:
            'Groups of 3 black keys highlighted. First key in each group pulsing.',
        },
        {
          stepNumber: 4,
          id: '1.2c',
          activity: 'Play the Alternating Pattern',
          direction:
            'Play the first black key in the group of two, then the first black key in the group of three. Repeat going up the keyboard.',
          assessment: 'pass_proceed',
          midiCriteria:
            'Alternating C#/Db and F#/Gb ascending. At least 3 pairs.',
          midiEval: { type: 'alternating', pitchClasses: [1, 6], minPairs: 3 },
          successFeedback:
            'This repeating pattern is called an OCTAVE. Every octave has the same notes in the same arrangement.',
          tag: 'piano_fund:octave_pattern | fundamentals',
        },
        {
          stepNumber: 5,
          id: '1.3a',
          activity: 'The Key Between the Two Black Keys',
          direction:
            'Using the groups of two black keys as your guide, find the white key that sits right between them.',
          assessment: 'pass_proceed',
          midiCriteria: 'User plays D in any octave. At least 3 octaves.',
          midiEval: { type: 'pitch_class', notes: [2], minOctaves: 3 },
          successFeedback:
            'That note is called D. You can always find D right between the two black keys.',
          tag: 'piano_fund:find_D | fundamentals',
          visual: 'White key between each group of 2 (D) pulsing.',
        },
        {
          stepNumber: 6,
          id: '1.3b',
          activity: 'The Keys on Each Side',
          direction:
            'Now find the white key just to the LEFT of the group of two black keys, and the white key just to the RIGHT.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays C then E (or E then C) in any octave. At least 2 octaves.',
          midiEval: { type: 'pitch_class', notes: [0, 4], minOctaves: 2 },
          successFeedback:
            'The key to the LEFT is C. The key to the RIGHT is E. You now know three notes: C, D, E!',
          tag: 'piano_fund:find_C_E | fundamentals',
          visual: 'C and E highlighted flanking each 2-black-key group.',
        },
        {
          stepNumber: 7,
          id: '1.3c',
          activity: 'The Keys Around the Three Black Keys',
          direction:
            'Now use the group of THREE black keys. Find the white key just to the LEFT of the group, and the white key just to the RIGHT.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays F then B in any octave. At least 2 octaves.',
          midiEval: { type: 'pitch_class', notes: [5, 11], minOctaves: 2 },
          successFeedback:
            'The key to the LEFT of the three black keys is F. The key to the RIGHT is B. And the white keys between the three black keys are G and A.',
          tag: 'piano_fund:find_F_B | fundamentals',
          visual: 'F and B highlighted flanking each 3-black-key group.',
        },
      ],
    },

    // ── Section 2: Note Names ──────────────────────────────────────
    {
      id: '2',
      name: 'Note Names',
      textPrompt:
        'Music uses the first seven letters of the alphabet: A, B, C, D, E, F, G. Then it starts over! This pattern repeats across the entire keyboard.',
      steps: [
        {
          stepNumber: 1,
          id: '2.1a',
          activity: 'Play C to B',
          direction:
            'Start on C -- the white key just to the LEFT of the group of two black keys. Play each white key going up: C, D, E, F, G, A, B.',
          assessment: 'pass_proceed',
          midiCriteria:
            'C, D, E, F, G, A, B in order, any octave. Exact note and correct order required.',
          midiEval: {
            type: 'sequence',
            notes: [0, 2, 4, 5, 7, 9, 11],
            octaveAware: false,
          },
          successFeedback:
            'C, D, E, F, G, A, B -- you just played all seven natural notes! After B, the pattern starts over with C again.',
          tag: 'piano_fund:musical_alphabet | fundamentals',
          visual:
            'Each note name appears on the keyboard as user plays it. Piano roll fills in from left to right.',
        },
        {
          stepNumber: 2,
          id: '2.1b',
          activity: 'Play C to C (One Octave)',
          direction:
            'Now play from C all the way up to the next C. That distance -- from one C to the next -- is called an OCTAVE.',
          assessment: 'pass_proceed',
          midiCriteria:
            'C, D, E, F, G, A, B, C in order. The last C must be exactly one octave above the first (12 semitones).',
          midiEval: {
            type: 'sequence',
            notes: [0, 2, 4, 5, 7, 9, 11, 0],
            octaveAware: false,
          },
          successFeedback:
            "One octave! The word 'octave' comes from the Latin word for eight -- you played eight notes from C to C.",
          tag: 'piano_fund:octave_CtoC | fundamentals',
          visual: "Both C's highlighted, with the distance labeled 'Octave.'",
        },
        {
          stepNumber: 3,
          id: '2.1c',
          activity: "Find All the C's",
          direction:
            'C is the most important landmark on the piano. Find and play every C you can reach on your keyboard.',
          assessment: 'pass_proceed',
          midiCriteria: 'User plays C in at least 4 different octaves.',
          midiEval: { type: 'pitch_class', notes: [0], minOctaves: 4 },
          successFeedback:
            "Every C sounds like the 'same note' just higher or lower. That's what octaves are -- the same note name at different heights.",
          tag: 'piano_fund:find_all_C | fundamentals',
          visual: "All C's highlighted across the keyboard.",
        },
        {
          stepNumber: 4,
          id: '2.1d',
          activity: 'Note Name Quiz',
          direction:
            "Let's test your note knowledge! Play the note shown on screen.",
          assessment: 'pass_proceed',
          midiCriteria:
            'App shows 7 random note names one at a time. User plays each. Pass requires 5/7 correct. Retry available.',
          midiEval: {
            type: 'quiz',
            notePool: [0, 2, 4, 5, 7, 9, 11],
            count: 7,
            passThreshold: 5,
          },
          successFeedback:
            'You know your note names! These seven notes are the foundation of all music.',
          tag: 'piano_fund:note_name_quiz | fundamentals',
          visual:
            "A note name appears on screen (e.g., 'Play G'). The correct key pulses gently on the keyboard display.",
        },
      ],
    },

    // ── Section 3: Sharps and Flats (Black Key Names) ──────────────
    {
      id: '3',
      name: 'Sharps and Flats (Black Key Names)',
      textPrompt:
        "The black keys also have names. Each black key sits between two white keys, and it can be named after either one. A SHARP (#) means 'one key higher.' A FLAT (b) means 'one key lower.' So the black key between C and D can be called C# (C sharp) or Db (D flat) -- it's the same key with two names!",
      steps: [
        {
          stepNumber: 1,
          id: '3.1a',
          activity: 'Find C Sharp / D Flat',
          direction:
            'Find the black key between C and D. This key is called C# or Db.',
          assessment: 'pass_proceed',
          midiCriteria: 'User plays C#/Db in any octave.',
          midiEval: { type: 'pitch_class', notes: [1], minOctaves: 1 },
          successFeedback:
            "That's C# (or Db). Every black key has two names -- one sharp name and one flat name.",
          tag: 'piano_fund:sharp_flat_intro | fundamentals',
          visual:
            'C and D labeled, black key between them pulsing with both names shown.',
        },
        {
          stepNumber: 2,
          id: '3.1b',
          activity: 'Name All Five Black Keys',
          direction:
            "There are five black keys in each octave. Let's name them all. Play each black key going up from C# to Bb.",
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays C#/Db, D#/Eb, F#/Gb, G#/Ab, A#/Bb in order, any octave.',
          midiEval: {
            type: 'sequence',
            notes: [1, 3, 6, 8, 10],
            octaveAware: false,
          },
          successFeedback:
            'Five black keys, each with two names. That gives us 12 total notes in each octave -- 7 white and 5 black. These 12 notes are ALL the notes in Western music!',
          tag: 'piano_fund:all_black_keys | fundamentals',
          visual: 'All black keys labeled with both sharp and flat names.',
        },
        {
          stepNumber: 3,
          id: '3.1c',
          activity: 'The Chromatic Scale',
          direction:
            'Play every key from C to the next C -- both white AND black keys. This is called the CHROMATIC SCALE -- all 12 notes in order.',
          assessment: 'pass_proceed',
          midiCriteria:
            'All 12 notes ascending from any C to the next C. Exact order required.',
          midiEval: { type: 'chromatic_ascending' },
          successFeedback:
            'The chromatic scale! Every scale, every chord, and every melody in this app is built from these 12 notes.',
          tag: 'piano_fund:chromatic_scale | fundamentals',
          visual: 'All 12 keys in one octave highlighted in sequence.',
        },
      ],
    },

    // ── Section 4: Octave Numbering and Register ───────────────────
    {
      id: '4',
      name: 'Octave Numbering and Register',
      textPrompt:
        "Every note on the piano has a name AND a number. The number tells you which octave it's in. The lowest notes are in octave 0 and 1, and the highest are in octave 7 and 8. The most important octave to know is octave 4 -- that's where MIDDLE C lives.",
      steps: [
        {
          stepNumber: 1,
          id: '4.1a',
          activity: 'Find Middle C (C4)',
          direction:
            "Find Middle C -- also called C4. It's the C closest to the middle of your keyboard. On a standard 88-key piano, it's the 4th C from the left.",
          assessment: 'pass_proceed',
          midiCriteria: 'User plays MIDI note 60 exactly.',
          midiEval: { type: 'exact_midi', midi: [60] },
          successFeedback:
            "That's Middle C, also called C4. This is the center of the piano and your home base for many activities in Music Atlas.",
          tag: 'piano_fund:middle_C | fundamentals',
          visual:
            'C4 (MIDI 60) pulsing on keyboard. Label "Middle C (C4)" displayed.',
        },
        {
          stepNumber: 2,
          id: '4.1b',
          activity: 'Play C in Every Octave',
          direction:
            'Now play C in every octave you can find, starting from the lowest C on your keyboard and going up. Listen to how the same note sounds different at each octave.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays at least 5 different C notes in ascending order. App labels each with octave number.',
          midiEval: { type: 'pitch_class', notes: [0], minOctaves: 5 },
          successFeedback:
            'C1, C2, C3, C4, C5, C6, C7 -- same note, different registers. The number tells you exactly where on the keyboard you are.',
          tag: 'piano_fund:octave_numbers | fundamentals',
          visual:
            'Each C labeled with its octave number as user plays it (C1, C2, C3, C4, C5, C6, C7).',
        },
        {
          stepNumber: 3,
          id: '4.2a',
          activity: 'Play in the Melody Zone',
          direction:
            'Play any notes in the MELODY zone (C4 to C6). This is where most melodies live -- bright, clear, and singable.',
          assessment: 'pass_proceed',
          midiCriteria:
            'User plays at least 4 notes, all within MIDI 60-84. Pass if all notes are in range.',
          midiEval: { type: 'range', min: 60, max: 84, minNotes: 4 },
          successFeedback:
            "That's the melody zone! When you do Melody activities in any genre, your right hand will play up here.",
          tag: 'piano_fund:melody_zone | fundamentals',
          visual:
            'Melody zone (C4-C6) highlighted in blue. Notes outside the zone are dimmed.',
        },
        {
          stepNumber: 4,
          id: '4.2b',
          activity: 'Play in the Chord Zone',
          direction:
            'Now play some notes in the CHORD zone (C3 to C4). This is where chords sound warm and full.',
          assessment: 'pass_proceed',
          midiCriteria: 'User plays at least 3 notes, all within MIDI 48-60.',
          midiEval: { type: 'range', min: 48, max: 60, minNotes: 3 },
          successFeedback:
            "That's the chord zone. When you play chords in Activity Flows, this is where they'll sit.",
          tag: 'piano_fund:chord_zone | fundamentals',
          visual:
            'Chord zone (C3-C4) highlighted in gold. Notes outside dimmed.',
        },
        {
          stepNumber: 5,
          id: '4.2c',
          activity: 'Play in the Bass Zone',
          direction:
            'Finally, play some notes in the BASS zone (C2 to C3). These are the deep, low notes that anchor the music.',
          assessment: 'pass_proceed',
          midiCriteria: 'User plays at least 3 notes, all within MIDI 36-48.',
          midiEval: { type: 'range', min: 36, max: 48, minNotes: 3 },
          successFeedback:
            "That's the bass zone. When you play bass lines, your left hand will be down here.",
          tag: 'piano_fund:bass_zone | fundamentals',
          visual: 'Bass zone (C2-C3) highlighted in red. Notes outside dimmed.',
        },
        {
          stepNumber: 6,
          id: '4.2d',
          activity: 'Play in All Three Zones',
          direction:
            'Now play one note in the bass zone, one in the chord zone, and one in the melody zone -- low, middle, high.',
          assessment: 'pass_proceed',
          midiCriteria:
            'One note in MIDI 36-48, one in MIDI 48-60, one in MIDI 60-84. Any order accepted, but all three zones must be hit.',
          midiEval: {
            type: 'multi_zone',
            zones: [
              { min: 36, max: 48, minNotes: 1 },
              { min: 48, max: 60, minNotes: 1 },
              { min: 60, max: 84, minNotes: 1 },
            ],
          },
          successFeedback:
            "Bass, chords, melody -- three zones, three musical roles. You'll use all of them as you learn different styles in Music Atlas!",
          tag: 'piano_fund:three_zones | fundamentals',
          visual:
            'All three zones highlighted. App waits for one note in each zone.',
        },
      ],
    },

    // ── Section 5: Hand Positions ──────────────────────────────────
    {
      id: '5',
      name: 'Hand Positions',
      textPrompt:
        'There are four common ways to position your hands on the keyboard. Each one is used for a different musical situation.',
      steps: [
        {
          stepNumber: 1,
          id: '5.1a',
          activity: 'Position 1: Left Hand Middle, Right Hand High',
          direction:
            'Place your left hand around the C3-C4 area and your right hand around C5. Play a few notes with each hand.',
          assessment: 'pass_proceed',
          midiCriteria:
            'At least one note in MIDI 48-60 range AND at least one note in MIDI 72-84 range.',
          midiEval: {
            type: 'multi_zone',
            zones: [
              { min: 48, max: 60, minNotes: 1 },
              { min: 72, max: 84, minNotes: 1 },
            ],
          },
          successFeedback:
            'Position 1: Left hand chords, right hand melody. This is your go-to for solo piano playing.',
          tag: 'piano_fund:hand_pos_1 | fundamentals',
          visual:
            'Keyboard showing LH around C3-C4 area, RH around C5-C6 area.',
        },
        {
          stepNumber: 2,
          id: '5.1b',
          activity: 'Position 2: Left Hand Low, Right Hand Middle',
          direction:
            'Place your left hand around C2-C3 and your right hand around C3-C4. Play a few notes with each hand.',
          assessment: 'pass_proceed',
          midiCriteria:
            'At least one note in MIDI 36-48 AND at least one in MIDI 48-60.',
          midiEval: {
            type: 'multi_zone',
            zones: [
              { min: 36, max: 48, minNotes: 1 },
              { min: 48, max: 60, minNotes: 1 },
            ],
          },
          successFeedback:
            "Position 2: Left hand bass, right hand chords. Use this when you're accompanying someone else.",
          tag: 'piano_fund:hand_pos_2 | fundamentals',
          visual: 'Keyboard showing LH around C2-C3, RH around C3-C4.',
        },
        {
          stepNumber: 3,
          id: '5.1c',
          activity: 'Position 3: Both Hands Middle',
          direction:
            'Place both hands in the middle of the keyboard around C4. Play notes with both hands close together.',
          assessment: 'pass_proceed',
          midiCriteria: 'At least 2 notes, all within MIDI 55-67 range.',
          midiEval: { type: 'range', min: 55, max: 67, minNotes: 2 },
          successFeedback:
            'Position 3: Both hands together in the middle. Great for unison melodies and two-handed chord voicings.',
          tag: 'piano_fund:hand_pos_3 | fundamentals',
          visual: 'Keyboard showing both hands around C3-C5.',
        },
        {
          stepNumber: 4,
          id: '5.1d',
          activity: 'Position 4: Left Hand Low, Right Hand High',
          direction:
            'Place your left hand around C2 and your right hand around C5. Play notes with each hand -- feel the wide stretch!',
          assessment: 'pass_proceed',
          midiCriteria:
            'At least one note in MIDI 36-48 AND at least one in MIDI 72-84.',
          midiEval: {
            type: 'multi_zone',
            zones: [
              { min: 36, max: 48, minNotes: 1 },
              { min: 72, max: 84, minNotes: 1 },
            ],
          },
          successFeedback:
            'Position 4: Full range! Bass in the left, melody in the right. This gives you the widest, fullest sound.',
          tag: 'piano_fund:hand_pos_4 | fundamentals',
          visual: 'Keyboard showing LH around C2-C3, RH around C5-C6.',
        },
      ],
    },

    // ── Section 6: Finger Placement for Chords ─────────────────────
    {
      id: '6',
      name: 'Finger Placement for Chords',
      textPrompt:
        'Each finger has a number. For BOTH hands, your thumb is finger 1, index finger is 2, middle finger is 3, ring finger is 4, and pinky is 5.',
      steps: [
        {
          stepNumber: 1,
          id: '6.1a',
          activity: 'Finger Number Check',
          direction:
            'Place your right hand on C4, D4, E4, F4, G4 -- one finger per key, thumb on C. Now play each finger one at a time: 1 (thumb), 2, 3, 4, 5.',
          assessment: 'pass_proceed',
          midiCriteria: 'C4, D4, E4, F4, G4 in order.',
          midiEval: {
            type: 'sequence',
            notes: [60, 62, 64, 65, 67],
            octaveAware: true,
          },
          successFeedback:
            'Five fingers, five notes! This five-finger position is the starting point for playing scales and melodies.',
          tag: 'piano_fund:finger_numbers | fundamentals',
          visual: 'Five keys highlighted (C4-G4) with finger numbers labeled.',
        },
        {
          stepNumber: 2,
          id: '6.2a',
          activity: 'Placement B1: Both Hands, Close Together',
          direction:
            'Play C-E-G with your left hand (fingers 5-3-1) and C-E-G with your right hand (fingers 1-3-5) one octave apart.',
          assessment: 'pass_proceed',
          midiCriteria:
            'C3, E3, G3, C4, E4, G4 (all 6 notes, any order, played within 2 seconds).',
          midiEval: {
            type: 'simultaneous',
            midi: [48, 52, 55, 60, 64, 67],
            windowMs: 2000,
          },
          successFeedback:
            'B1: Both hands close together playing the same chord shape.',
          tag: 'piano_fund:chord_B1 | fundamentals',
          visual:
            'Both hands in the C3-C4 range, thumbs close together, playing a chord.',
        },
        {
          stepNumber: 3,
          id: '6.2b',
          activity: 'Placement B2: Both Hands, Spread',
          direction:
            'Play C-E-G with your left hand in the C3 octave and C-E-G with your right hand in the C4 octave.',
          assessment: 'pass_proceed',
          midiCriteria: 'C3, E3, G3, C4, E4, G4 or similar spread voicing.',
          midiEval: {
            type: 'simultaneous',
            midi: [48, 52, 55, 60, 64, 67],
            windowMs: 2000,
          },
          successFeedback:
            'B2: Both hands spread wider for a fuller chord sound.',
          tag: 'piano_fund:chord_B2 | fundamentals',
          visual: 'Both hands wider apart, LH lower octave, RH higher.',
        },
        {
          stepNumber: 4,
          id: '6.2c',
          activity: 'Placement R1: Right Hand, Close Voicing',
          direction:
            'Play C-E-G with your right hand (thumb on C, middle finger on E, pinky on G).',
          assessment: 'pass_proceed',
          midiCriteria: 'C4, E4, G4 (3 notes within 2 seconds).',
          midiEval: {
            type: 'simultaneous',
            midi: [60, 64, 67],
            windowMs: 2000,
          },
          successFeedback:
            'R1: Right hand close voicing -- thumb, middle, pinky.',
          tag: 'piano_fund:chord_R1 | fundamentals',
          visual: 'Right hand only, fingers 1-3-5 on a triad.',
        },
        {
          stepNumber: 5,
          id: '6.2d',
          activity: 'Placement R2: Right Hand, Wide Voicing',
          direction:
            'Play C-G-E with your right hand spread wider (thumb on C4, ring finger on G4, pinky reaching up to E5 -- or whatever is comfortable).',
          assessment: 'pass_proceed',
          midiCriteria:
            'Any 3+ note voicing in the right hand area (MIDI 60-77) played simultaneously.',
          midiEval: { type: 'range', min: 60, max: 77, minNotes: 3 },
          successFeedback:
            'R2: Right hand wide voicing -- stretching across more keys.',
          tag: 'piano_fund:chord_R2 | fundamentals',
          visual: 'Right hand stretched wider for a larger chord.',
        },
        {
          stepNumber: 6,
          id: '6.2e',
          activity: 'Placement L1: Left Hand, Close Voicing',
          direction:
            'Play C-E-G with your left hand (pinky on C3, middle finger on E3, thumb on G3).',
          assessment: 'pass_proceed',
          midiCriteria: 'C3, E3, G3 (3 notes within 2 seconds).',
          midiEval: {
            type: 'simultaneous',
            midi: [48, 52, 55],
            windowMs: 2000,
          },
          successFeedback:
            'L1: Left hand close voicing -- pinky, middle, thumb.',
          tag: 'piano_fund:chord_L1 | fundamentals',
          visual: 'Left hand only, fingers 5-3-1 on a triad.',
        },
        {
          stepNumber: 7,
          id: '6.2f',
          activity: 'Placement L2: Left Hand, Wide Voicing',
          direction:
            "Play a wider C chord with your left hand -- try C2-G2-E3 or any spread that's comfortable.",
          assessment: 'pass_proceed',
          midiCriteria:
            'Any 3+ note voicing in left hand area (MIDI 36-55) played simultaneously.',
          midiEval: { type: 'range', min: 36, max: 55, minNotes: 3 },
          successFeedback:
            'L2: Left hand wide voicing -- stretching for a fuller sound.',
          tag: 'piano_fund:chord_L2 | fundamentals',
          visual: 'Left hand stretched for a wider voicing.',
        },
      ],
    },

    // ── Section 7: Review Challenge ────────────────────────────────
    {
      id: '7',
      name: 'Review Challenge',
      textPrompt:
        "Let's put it all together! Complete these challenges to finish Piano Fundamentals.",
      steps: [
        {
          stepNumber: 1,
          id: '7.1a',
          activity: 'Note Name Speed Round',
          direction:
            'Play each note as it appears on screen. You have 3 seconds per note!',
          assessment: 'pass_proceed',
          midiCriteria:
            '12 notes shown in random order (C, F, A, D, G, B, E + C#, Eb, F#, Ab, Bb). Score: X/12 correct. Pass at 9/12.',
          midiEval: {
            type: 'quiz',
            notePool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            count: 12,
            passThreshold: 9,
            timeLimitMs: 3000,
          },
          successFeedback: 'Excellent note recognition!',
          tag: 'piano_fund:note_speed_round | fundamentals',
          visual: 'Note names appear one at a time with a countdown timer.',
        },
        {
          stepNumber: 2,
          id: '7.1b',
          activity: 'Octave Identification',
          direction:
            'Play the note in the EXACT octave shown: C4, then G2, then E5, then D3.',
          assessment: 'pass_proceed',
          midiCriteria:
            'Exact MIDI note required (C4=60, G2=43, E5=76, D3=50). 4 notes, pass at 3/4.',
          midiEval: {
            type: 'quiz',
            notePool: [60, 43, 76, 50],
            count: 4,
            passThreshold: 3,
            octaveAware: true,
          },
          successFeedback: 'You know your octaves!',
          tag: 'piano_fund:octave_identification | fundamentals',
          visual:
            'Each note shown with octave number. Correct zone highlighted on keyboard.',
        },
        {
          stepNumber: 3,
          id: '7.1c',
          activity: 'Zone Check',
          direction:
            'Play any chord in the CHORD zone, then play a melody note in the MELODY zone, then play a bass note in the BASS zone.',
          assessment: 'pass_proceed',
          midiCriteria:
            '3+ notes simultaneously in MIDI 48-60, then any note in MIDI 60-84, then any note in MIDI 36-48.',
          midiEval: {
            type: 'ordered_ranges',
            phases: [
              { min: 48, max: 60, minNotes: 3, simultaneous: true },
              { min: 60, max: 84, minNotes: 1 },
              { min: 36, max: 48, minNotes: 1 },
            ],
          },
          successFeedback:
            "Congratulations! You've completed Piano Fundamentals. You now know the layout of the keyboard, all the note names including sharps and flats, the octave numbering system, the three register zones, four hand positions, and six chord finger placements. You're ready to explore any genre in Music Atlas!",
          tag: 'piano_fund:zone_check | fundamentals',
        },
      ],
    },
  ],
};
