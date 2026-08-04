/* eslint-disable */
/**
 * Music Atlas Teacher — Canonical Activity Bank Seed (v1)
 *
 * Sourced from Music Bridge IMPACT Music Pedagogy curriculum under MOU.
 * Music Bridge is referenced as the source in this engineering documentation
 * only — never surfaced in user-facing copy or UI.
 *
 * Drafted with Claude, May 2026.
 *
 * Authoring notes:
 *   - CLOs are written in IMPACT student voice (first-person "When I... I feel/can/know").
 *   - Atlas module references are AMBITIOUS — they describe where these activities
 *     COULD live in Atlas, which guides platform evolution. Some referenced Atlas
 *     capabilities may not yet exist; that's intentional.
 *   - No external (non-Atlas) URLs anywhere. If the source PDF mentioned Logic Pro,
 *     YouTube, etc., those references are replaced with Atlas Studio / Globe / etc.
 *   - Some source activities were title-only or partially detailed. Those have been
 *     drafted by Claude based on the surrounding pedagogical context; Aaron's review
 *     pass should refine as needed.
 *
 * Activities are listed in order by phase:
 *   1. connectRegulate    (~19 activities)
 *   2. groupPractice      (~30 activities)
 *   3. creativeProjects   (~21 activities)
 *   4. presentPerform     (~5 activities)
 *   5. respondReflectReset (~4 activities)
 */

const CREATED_AT = '2026-05-18';

const activities = [

  /* ============================================================
     PHASE 1: CONNECT / REGULATE
     ============================================================ */

  {
    id: 'rhythmic-entrainment',
    title: 'Rhythmic Entrainment',
    phase: 'connectRegulate',
    purpose: 'Regulation',
    initiationStyle: 'learn-to-apply',
    description:
      'Students perform a steady rhythm together — with a play-along track, the instructor, or each other — and pay close attention to rhythmic alignment. Starts with simple unison quarter notes; can extend to clapping in unison with eyes closed, or splitting the room into two-group cross-rhythms. Three to five minutes is plenty.',
    learningOutcome:
      'Students learn to attune their attention and physical action to a shared beat — the foundation of ensemble musicianship and a powerful nervous-system regulator.',
    assessment:
      'Performance: Can the student accurately and consistently align their playing with the given downbeat and tempo?',
    clos: {
      awarenessOfFeeling:
        'When I train my attention on aligning my playing with a steady beat, I feel focused, alert, energized, and connected to the people around me.',
      awarenessOfTechnique:
        'I can contribute to a tight groove by aligning my downbeat with my fellow musicians.',
      awarenessOfContext:
        'Entrainment is what makes ensemble music possible — from West African drum circles to a rock band locking in to a click track.',
    },
    standards: ['Performing', 'Responding', 'Connecting'],
    impactValues: ['Therapeutic', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: steady-tempo play-along tracks', contextNote: 'Use Studio percussion tracks at 60–80 bpm as the entrainment anchor.' },
      { module: 'arcade', label: 'Atlas Arcade: rhythm precision games', contextNote: 'Light gamified version of the same skill — useful as a closing reinforcement.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'intentional-listening',
    title: 'Intentional Listening',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students listen for emotion, setting, or stylistic elements in a specific piece, then write creatively about it or tag it with descriptive hashtags. Works as a 5-minute opening ritual; extends to a full Artist Spotlight when paired with biographical context.',
    learningOutcome:
      'Students develop the habit of listening as an active, focused, articulable act — not passive background.',
    assessment:
      'Participation: Did student participate in discussion and/or submit a written response?',
    clos: {
      awarenessOfFeeling:
        'When I listen closely to music, I can identify emotions, stories, and elements of style that I would miss if I were only half-listening.',
      awarenessOfTechnique:
        'I can describe what I hear using musical vocabulary — instruments, dynamics, rhythm, texture, harmony.',
      awarenessOfContext:
        'When I hear a specific stylistic element like a piano montuno, I know it points to a tradition — likely Latin American, probably Salsa.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Community-Responsive', 'Therapeutic', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: explore the artist or style', contextNote: 'After listening, students use Globe to research where this music comes from.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'box-breathing',
    title: 'Box Breathing',
    phase: 'connectRegulate',
    purpose: 'Regulation',
    initiationStyle: 'learn-to-apply',
    description:
      'Students breathe in for 4 counts, hold for 4, breathe out for 4, and hold for 4. Do this while listening to music or playing, counting beats from the music. Works equally well as a 30-second open or a 3-minute centering practice. Pair with music in steady tempo (60–80 bpm) for easiest entrainment.',
    learningOutcome:
      'Students learn to use breath as a self-regulation tool that integrates with rhythmic awareness.',
    assessment:
      'Participation: Did student participate in the breathing exercise and make a sincere attempt to align breath with the beat?',
    clos: {
      awarenessOfFeeling:
        'When I do box breathing with a piece of music, I feel more focused, alert, calm, and connected.',
      awarenessOfTechnique:
        'I can breathe in a steady 4-count rhythm and align my breath cycle with a piece of music.',
      awarenessOfContext:
        'Many musicians, athletes, and military personnel use box breathing before high-pressure moments to regulate their nervous systems.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Therapeutic', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: 60bpm play-along', contextNote: 'Use Studio backing tracks for breath entrainment — start with simple percussion.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'binaural-beats',
    title: 'Binaural Beats — Listening and Creation',
    phase: 'connectRegulate',
    purpose: 'Regulation',
    initiationStyle: 'hybrid',
    description:
      'Phase 1: students listen on headphones to binaural beat examples at different frequency differences — 3 Hz delta for deep relaxation, 10 Hz alpha for relaxed focus, 15 Hz beta for alert thinking. Phase 2: students create their own binaural experiment in Atlas Studio using two slightly-detuned sine tones panned hard left and hard right. Requires headphones for both phases.',
    learningOutcome:
      'Students experience how sound design directly influences nervous-system state, and learn the basics of binaural audio production.',
    assessment:
      'Participation: Did student listen attentively on headphones? Project: Did student effectively use two complementary frequencies to create a binaural auditory experience?',
    clos: {
      awarenessOfFeeling:
        'When I listen to binaural beats, I feel focused, alert, calm, or connected depending on the frequency choice.',
      awarenessOfTechnique:
        'I can create binaural panning in Atlas Studio by panning two slightly-detuned sine tones hard left and hard right.',
      awarenessOfContext:
        'Artists like Benee have used binaural beat-making to manage their own anxiety. The technique sits at the intersection of music production and therapeutic practice.',
    },
    standards: ['Creating', 'Responding'],
    impactValues: ['Therapeutic', 'Modern', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: binaural panning experiment', contextNote: 'Use two oscillators with hard L/R panning and a 3–15 Hz frequency offset.' },
      { module: 'theory-lesson', label: 'Atlas Theory: psychoacoustics and brainwave entrainment', contextNote: 'Foundational reading on why binaural beats work.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'physicalize',
    title: 'Physicalize — Dance or Sing',
    phase: 'connectRegulate',
    purpose: 'Regulation',
    initiationStyle: 'join-the-expert',
    description:
      'Students move their body to music — dance, sway, sing, conduct. Choose music with strong rhythmic identity (salsa, hip hop, gospel, samba). Demonstrate a simple movement pattern; invite students to mirror, modify, or invent their own. Two minutes is enough; this is a regulating opener, not a dance lesson.',
    learningOutcome:
      'Students learn to use the body as a primary instrument of musical understanding — bypassing self-conscious analysis and accessing music kinesthetically.',
    assessment:
      'Participation: Did student make earnest attempts to move their body and/or sing as directed?',
    clos: {
      awarenessOfFeeling:
        'When I move my body to music, I feel more present, less self-conscious, and connected to the music in a deeper way than just listening.',
      awarenessOfTechnique:
        'For basic salsa, I move my feet in a R-L-R, L-R-L pattern with a short-short-long rhythm.',
      awarenessOfContext:
        'When I learn a basic salsa dance move, I understand the clave better because of the accent on beat 4. Dance and music are inseparable in many traditions.',
    },
    standards: ['Performing', 'Responding', 'Connecting'],
    impactValues: ['Inclusive', 'Therapeutic', 'Community-Responsive'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: dance traditions of the world', contextNote: 'Explore how dance and music co-evolve in specific cultural contexts.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'community-check-in',
    title: 'Community Check-In',
    phase: 'connectRegulate',
    purpose: 'Check-In',
    initiationStyle: 'learn-to-apply',
    description:
      'Students check in briefly about their current state — verbally, on paper, or via an emoji grid. Common patterns: "rose and thorn" (one good thing, one hard thing), numbering personal energy 1–5, or pointing to a face on an emotional picture grid. Goal is to name what\'s present so we can work with it — not to perform "everything\'s fine."',
    learningOutcome:
      'Students develop the practice of identifying and articulating their emotional and physical state, building self-awareness and trust in the classroom community.',
    assessment:
      'Participation: Did student respond to the check-in (verbally or nonverbally)?',
    clos: {
      awarenessOfFeeling:
        'When my peers and I share and check in about our day and our energy, I feel more self-aware, connected, and not alone.',
      awarenessOfTechnique:
        'I can name how I\'m feeling using emotional vocabulary instead of "fine" or "whatever."',
      awarenessOfContext:
        'When we share in class, we learn more about why each of us behaves the way we do — this is the foundation of a real community.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Therapeutic', 'Community-Responsive', 'Inclusive'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'name-games',
    title: 'Name Games',
    phase: 'connectRegulate',
    purpose: 'Rituals',
    initiationStyle: 'join-the-expert',
    description:
      'Variation 1: Students go around the room saying "My name is ____" and the class says back "Hi ______." Variation 2: Students say their name, then the next person says their name plus the previous student\'s name; the third adds theirs to the list, and so on. The list gets longer; tension builds. Best in the first weeks of a new class.',
    learningOutcome:
      'Students learn each other\'s names and build the foundation of recognition that makes a classroom feel like a community.',
    assessment: 'Participation: Did student say their name and others\' names?',
    clos: {
      awarenessOfFeeling:
        'Knowing the names of my peers in class helps me feel connected, not alone, curious about others, and less inhibited.',
      awarenessOfTechnique:
        'I can remember and recall names by associating them with faces and small details I learn about each person.',
      awarenessOfContext:
        'Calling someone by their name is a basic act of recognition — in most cultures, learning names is the first move toward belonging.',
    },
    standards: ['Connecting'],
    impactValues: ['Inclusive', 'Community-Responsive', 'Prosocial'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'passive-listening',
    title: 'Passive Listening',
    phase: 'connectRegulate',
    purpose: 'Rituals',
    initiationStyle: 'learn-to-apply',
    description:
      'Music plays as students enter the space, related to the theme of the lesson. No discussion required; the music primes the room. Choose tracks that match the energy you\'re trying to set — calming for a regulating day, energizing for a creative push, contextually relevant for a unit theme.',
    learningOutcome:
      'Students learn that the sonic environment is itself a teaching tool, and that being immersed in music — even passively — builds intuition and reference.',
    assessment: 'Implicit: did students arrive into the prepared sonic environment?',
    clos: {
      awarenessOfFeeling:
        'When I walk into a classroom with music already playing, I feel oriented, welcomed, and ready to engage.',
      awarenessOfTechnique:
        'I can listen passively while preparing my materials and let the music inform my sense of the day\'s theme.',
      awarenessOfContext:
        'Many cultures use ambient music to mark transitions — from cafés to religious services to film scores. Music sets the scene.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Therapeutic', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: curated theme playlists', contextNote: 'Use Globe playlists to source thematically-aligned music for the day or unit.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-instruments',
    title: 'Listen for the Instruments and Parts',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students identify instruments and musical parts such as bass, keyboards, guitar, beat drops, glitches, etc. Teacher plays excerpts; students raise hands when they hear specific elements, contribute observations, or complete a listening worksheet identifying instrument families and ensemble roles.',
    learningOutcome:
      'Students develop the ability to hear individual parts within a layered musical texture — a foundational skill for both listening and producing.',
    assessment:
      'Participation: Did student raise their hand when prompted or contribute to discussion? Written work: Did student complete the worksheet?',
    clos: {
      awarenessOfFeeling:
        'When I can hear all the parts of a song separately, I feel more connected to the musicians who made it — like I can see how it was built.',
      awarenessOfTechnique:
        'When I listen intently, I can hear which instruments are playing which parts — bass plays the low notes, kick drum plays the low hits, melody is usually high, and chords come from keyboard, guitar, or pads.',
      awarenessOfContext:
        'Every piece of music is made of some variation of instrumental sounds, vocals, drums, and musical effects.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Accessible', 'Modern', 'Community-Responsive'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: stem-isolated listening', contextNote: 'When available, Globe can present a song with stems separated so students hear each instrument alone.' },
      { module: 'studio', label: 'Atlas Studio: examine the multitrack', contextNote: 'Open a multitrack in Studio and mute/solo tracks to reveal the parts.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-structures',
    title: 'Listen for the Structures',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students identify patterns in beats, melodies, chord progressions, song form sections, and production elements. Teacher plays an excerpt; students count beats, identify 2- or 4-bar loops, mark the chorus return, or count the bars of a verse.',
    learningOutcome:
      'Students learn that music has architecture — that under the surface there are repeating, nested patterns that organize what we hear.',
    assessment:
      'Participation: Did student contribute? Written work: Did student complete the worksheet (counting bars, labeling sections)?',
    clos: {
      awarenessOfFeeling:
        'When I notice patterns in music, I feel like I\'m hearing the music more honestly — not just experiencing it, but understanding it.',
      awarenessOfTechnique:
        'When I listen intently, I can count beats and identify a 1-bar, 2-bar, or 4-bar loop.',
      awarenessOfContext:
        'Hip Hop beats are most often built on 2-bar and 4-bar loops, often drawn from chopped samples. Drum and Bass or Break Beats are often built from chopped, rearranged, sped-up funk beats from artists like James Brown.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Accessible', 'Modern'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: song form across styles', contextNote: 'Compare 12-bar blues, 32-bar AABA, verse-chorus pop, and through-composed forms.' },
      { module: 'theory-lesson', label: 'Atlas Theory: musical form', contextNote: 'The theory backing for what students are hearing.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-style',
    title: 'Listen for the Style',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students listen for the stylistic elements in a specific piece — naming instruments, techniques, rhythms — and/or label the piece with hashtags. Teacher curates examples from across genres and asks students to articulate what makes each one sound like its style.',
    learningOutcome:
      'Students develop stylistic literacy — the ability to recognize and name what places a piece of music in its tradition.',
    assessment:
      'Participation: Did student contribute? Written work: Did student complete the worksheet?',
    clos: {
      awarenessOfFeeling:
        'When I can name the style of a piece I\'m hearing, I feel less lost and more curious — I have a foothold to explore from.',
      awarenessOfTechnique:
        'When I hear an arpeggiated part with a mix of downbeats and anticipations, I know it\'s probably a montuno. I can clap or speak the clave rhythm along with it and identify 2-3 or 3-2.',
      awarenessOfContext:
        'When I hear a stylistic technique, I am aware of its historical and cultural connections — the artists, regions, eras, and record labels it traces back to.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Community-Responsive', 'Modern', 'Inclusive'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: stylistic signatures', contextNote: 'Each genre lesson covers the techniques and rhythms that signal that style.' },
      { module: 'globe', label: 'Atlas Globe: stylistic origins', contextNote: 'Trace styles back to their cultural and geographic origins.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-the-feels',
    title: 'Listen For the Feels',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students listen for the emotion in a specific piece, then write creatively or label the piece with hashtags. Validates the affective dimension of listening as a real, articulable, shared experience.',
    learningOutcome:
      'Students learn to articulate the emotional content of music and recognize how composers intentionally create emotion through musical choices.',
    assessment:
      'Participation: Did student contribute? Written work: Did student complete the worksheet?',
    clos: {
      awarenessOfFeeling:
        'I can listen to music and identify the feeling the composer intended, as well as articulate the feeling I get from the music — even if it\'s different.',
      awarenessOfTechnique:
        'I can describe the emotional content of a piece using specific musical observations — slow tempo, minor key, sparse texture, falling melodic line.',
      awarenessOfContext:
        'Emotional response to music is partly universal and partly cultural. Two people can hear the same piece and feel different things; both responses are real.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Therapeutic', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: emotion and harmony', contextNote: 'How major/minor, consonance/dissonance, tempo, and articulation shape feeling.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-the-story',
    title: 'Listen for the Story',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Students listen for the lyrical or programmatic story in a piece — what is the song or instrumental work *about*? Write creatively or label with hashtags. Works for both lyrical music (where the story is on the surface) and programmatic instrumental music (where the music itself tells the story).',
    learningOutcome:
      'Students learn to identify how music conveys narrative — through lyrics, motif, instrumentation, dynamics, and form.',
    assessment:
      'Participation: Did student contribute? Written work: Did student complete the worksheet?',
    clos: {
      awarenessOfFeeling:
        'When I hear a story in music, I feel like the music is talking directly to me — even when there are no words.',
      awarenessOfTechnique:
        'I can articulate what techniques — instrumentation, harmony, effects, motif — a composer uses to tell a story with their music. A composer can use half-step intervals to create tension and fear, like in the Jaws theme or the Psycho shower scene.',
      awarenessOfContext:
        'Programmatic music has a long tradition — Vivaldi\'s Four Seasons, Berlioz\'s Symphonie Fantastique, film scores. The story is always there if you know to listen for it.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Community-Responsive', 'Inclusive'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: programmatic music traditions', contextNote: 'Explore how different cultures use music to tell stories — from raga to film scoring.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listen-for-empathy',
    title: 'Listen for Empathy',
    phase: 'connectRegulate',
    purpose: 'Artist Spotlight',
    initiationStyle: 'learn-to-apply',
    description:
      'Students listen for the experiential context or story in a song, then write responses to three questions: (1) What is the story about? (2) Can you see yourself or a friend in this story? (3) What would you do — or tell your friend to do — in that situation? This is where listening becomes pro-social imagination.',
    learningOutcome:
      'Students learn to use music as a doorway into empathy — connecting their own experience and the experiences of people they care about to the experience the song is describing.',
    assessment:
      'Participation: Did student contribute? Written work: Did student complete the empathy worksheet?',
    clos: {
      awarenessOfFeeling:
        'I can identify the story being conveyed in a song and relate it to my own experience, my feelings, and the people around me.',
      awarenessOfTechnique:
        'I can articulate what I would say or do to support a friend in the situation the song describes.',
      awarenessOfContext:
        'Songs are stories — and listening to them with empathy is one of the original reasons music exists.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Therapeutic', 'Prosocial', 'Community-Responsive'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listening-emotion-setting',
    title: 'Listening for Emotion and Setting',
    phase: 'connectRegulate',
    purpose: 'Artist Spotlight',
    initiationStyle: 'learn-to-apply',
    description:
      'Teacher plays a recording of evocative music — Bossa Nova, Big Band swing, Afro-Cuban salsa, Blues, Gypsy Jazz, Mongolian throat singing, Gamelan ensemble, Balkan odd-meter groove, Ghanaian percussion. Students close their eyes and listen. Prompts: "Imagine where this music is taking place. Who is playing it? What are they feeling? What are you feeling as you listen?"',
    learningOutcome:
      'Students engage their imagination as a listening tool — building visual, emotional, and contextual associations with music from traditions they may not know firsthand.',
    assessment: 'Participation: Did student listen attentively and share their imagery in discussion or writing?',
    clos: {
      awarenessOfFeeling:
        'When I close my eyes and listen, I can picture a scene and feel what the music feels — even if I\'ve never been to where this music is from.',
      awarenessOfTechnique:
        'I can describe what I imagined using specific musical details — what the rhythm did, what the texture felt like, where the energy went.',
      awarenessOfContext:
        'Music carries its place of origin in its sound. With practice, I can hear a piece and have a real sense of where in the world I might be hearing it.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Therapeutic'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: music from around the world', contextNote: 'After listening, students can locate the tradition on Globe and learn more.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listening-stylistic-elements',
    title: 'Listening for Stylistic Elements',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'learn-to-apply',
    description:
      'Teacher plays a recording from a specific tradition — Bossa Nova, Salsa, Blues, Gamelan, etc. — and asks students to listen for specific elements: "What instruments do you hear? Voice, guitar, drums?" Then teacher identifies specific parts and invites students to tap, clap, mime playing, or sing along with each. Optional: show a video of the performance or pictures of the instruments.',
    learningOutcome:
      'Students learn to listen for and embody specific stylistic elements, building stylistic vocabulary kinesthetically.',
    assessment: 'Participation: Did student attempt to tap, clap, or sing along with the identified parts?',
    clos: {
      awarenessOfFeeling:
        'When I clap along with a clave or mime a stride bass line, I feel the style in my body, not just my head.',
      awarenessOfTechnique:
        'I can identify and physically reproduce one or more stylistic elements from a recording — a specific rhythm, a melodic motif, an instrumental role.',
      awarenessOfContext:
        'Every style has a small set of identifying elements. Once I learn those elements, I can recognize the style anywhere it shows up.',
    },
    standards: ['Performing', 'Responding', 'Connecting'],
    impactValues: ['Community-Responsive', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: stylistic deep-dives', contextNote: 'Each genre lesson covers the signature elements of that style.' },
      { module: 'globe', label: 'Atlas Globe: where the style comes from', contextNote: 'Place the style on the world map and explore its history.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'cultural-connections',
    title: 'Cultural Connections',
    phase: 'connectRegulate',
    purpose: 'Artist Spotlight',
    initiationStyle: 'try-it-first',
    description:
      'Students are asked about music they hear at home — what plays at family gatherings, what their parents/grandparents listen to, what reminds them of where they\'re from. Teacher builds a class playlist from their contributions and uses it through the unit for listening, analysis, and performance.',
    learningOutcome:
      'Students see their home culture reflected in classroom curriculum, and the class playlist becomes a collective portrait of who\'s in the room.',
    assessment: 'Participation: Did student contribute musical examples or preferences to the class playlist?',
    clos: {
      awarenessOfFeeling:
        'When the music I grew up with shows up in class, I feel seen — like the class belongs to me too.',
      awarenessOfTechnique:
        'I can articulate why a piece of music matters to me, and what specifically I want my classmates to notice when they hear it.',
      awarenessOfContext:
        'Every classroom is a unique cultural map. The music we make together is richer when it reflects all of us.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Therapeutic'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: build a class playlist', contextNote: 'Use Globe to collect students\' home music and place each piece in its cultural context.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'historical-connections',
    title: 'Historical Connections',
    phase: 'connectRegulate',
    purpose: 'Artist Spotlight',
    initiationStyle: 'learn-to-apply',
    description:
      'Teacher presents the historical background of a modern music example or technology, showing students the influences, roots, or previous iterations — alongside diverse historical innovators. Students then do their own historical research on a musical artist, style, song, or technology, citing influences, roots, previous iterations, and innovators.',
    learningOutcome:
      'Students learn that no music exists in isolation — every modern style has a deep lineage, and tracing that lineage often surfaces voices the canon overlooks.',
    assessment: 'Written work or presentation: Did student complete the research and cite their sources?',
    clos: {
      awarenessOfFeeling:
        'When I trace a song I love back through its influences, I feel connected to a long line of musicians I never knew about — and curious to hear more.',
      awarenessOfTechnique:
        'I can research a musical lineage and identify the artists, styles, and technologies that shaped a piece of music I care about.',
      awarenessOfContext:
        'Modern music draws from deep wells. Hip Hop pulls from funk, soul, jazz, gospel, and West African drumming. Pop pulls from R&B, country, dance music. Knowing the lineage makes the music richer.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Modern'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: trace musical lineages', contextNote: 'Globe surfaces the lineage relationships between styles, eras, and artists.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: how styles evolved', contextNote: 'Each genre lesson includes its lineage and key innovators.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'emotional-connections',
    title: 'Emotional Connections',
    phase: 'connectRegulate',
    purpose: 'Active Listening',
    initiationStyle: 'try-it-first',
    description:
      'Teacher plays a melody in a major key, then the same or similar melody in minor; asks students to comment on the different emotion. Repeats with cadential chord progressions in major and minor. Then students create melodies or progressions intended to convey specific emotions; the class guesses or votes on the intended emotion for each student\'s piece.',
    learningOutcome:
      'Students learn that emotional meaning in music is something composers actively construct, not something that just happens — and they get to be the composer.',
    assessment: 'Participation in discussion + creative output (their own emotion-targeted melody or progression).',
    clos: {
      awarenessOfFeeling:
        'When I write a melody to convey a feeling, I notice how much control I have over what listeners feel — and how much of music is choice.',
      awarenessOfTechnique:
        'I can write a melody or progression aimed at a specific emotion by choosing major or minor, fast or slow, smooth or angular, consonant or dissonant.',
      awarenessOfContext:
        'Every composer makes these choices on every piece. The emotion you feel when you listen is rarely accidental.',
    },
    standards: ['Creating', 'Responding'],
    impactValues: ['Inclusive', 'Therapeutic', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: write an emotion-targeted melody', contextNote: 'Quick melody sketches in Studio.' },
      { module: 'theory-lesson', label: 'Atlas Theory: emotion and harmonic language', contextNote: 'The theoretical underpinning for why major sounds happy and minor sounds sad — and why those generalizations break down.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },


  /* ============================================================
     PHASE 2: GROUP PRACTICE
     ============================================================ */

  {
    id: 'stylistic-technique',
    title: 'Stylistic Technique',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students learn to play specific stylistic techniques — a montuno, a broken chord, a blues riff, a stride pattern, a reggae skank, a Bo Diddley beat. Teacher demonstrates; students try; group works toward consistent execution.',
    learningOutcome:
      'Students build a vocabulary of stylistic techniques they can recognize, name, and execute.',
    assessment:
      'Performance: Did student perform an approximate or complete rendition of the technique? Written work: Did student complete a technique worksheet?',
    clos: {
      awarenessOfFeeling:
        'When I can play a stylistic technique I\'ve been hearing for years, I feel a kind of recognition — like I just unlocked something that was always there.',
      awarenessOfTechnique:
        'I can play a montuno by arpeggiating chords in a 2-bar repeating rhythm that accents the downbeat in one bar and anticipates the downbeat in the other. I can improvise over a blues by playing melodic phrases using notes from a blues scale.',
      awarenessOfContext:
        'When I play a stylistic technique, I am aware of its historical and cultural connection — the artists, regions, eras, and labels it came from.',
    },
    standards: ['Performing', 'Responding', 'Connecting'],
    impactValues: ['Inclusive', 'Accessible', 'Community-Responsive'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: technique deep-dives', contextNote: 'Each genre lesson includes core techniques with notation and audio.' },
      { module: 'studio', label: 'Atlas Studio: practice the technique with a backing track', contextNote: 'Loop the relevant style track and practice the technique over it.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'instrumental-technique',
    title: 'Instrumental Technique',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students work on specific techniques on their instruments — major triads in all 12 keys, the first 5 notes of a minor scale in 4 keys, hand-independence on piano, alternate picking on guitar, breath support on a wind instrument, finger snare technique. Teacher models, students practice, group checks in.',
    learningOutcome:
      'Students build the physical, technical foundation that makes everything else possible.',
    assessment:
      'Performance: Did student perform an approximate or complete rendition? Written work: Did student log their technique work?',
    clos: {
      awarenessOfFeeling:
        'When I build technique, I sometimes feel impatient — but I also notice that everything else gets easier as my technique grows.',
      awarenessOfTechnique:
        'I can play a major triad in all 12 keys. I can play the first 5 notes of a minor scale in 4 keys. I can play the piano with my hands in different positions to play a melody with chords, or chords with a bass line.',
      awarenessOfContext:
        'When I build instrumental skill, I become capable of playing more musical styles and pieces. Technique is what lets me say what I want to say.',
    },
    standards: ['Performing'],
    impactValues: ['Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: scales, chords, intervals', contextNote: 'Theoretical foundations for what students are practicing.' },
      { module: 'arcade', label: 'Atlas Arcade: technique drilling games', contextNote: 'Make the boring parts a game — scale runs, chord recognition, interval ear-training.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'group-practicing',
    title: 'Group Practicing',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students practice specific musical skills together with teacher-facilitated scaffolding. Repeated reps with a goal of consistent, skillful execution. Works for any skill — a stylistic technique, a passage from a piece, a chord progression in multiple keys.',
    learningOutcome:
      'Students develop the discipline and patience of practice — and the community of practicing alongside others.',
    assessment: 'Participation: Did student participate in the directed practice?',
    clos: {
      awarenessOfFeeling:
        'When I practice in a group, the work feels less lonely — and I get inspired by what others are figuring out.',
      awarenessOfTechnique:
        'I can execute a specific skill by implementing the right technique. For example, I can chunk minor chords on "Still Dre" by playing Bbmin in 1st inversion 8 times, then 2nd inversion Fmin sus4 3 times, then Fmin 4 times.',
      awarenessOfContext:
        'Group practice is how most music gets made. Ensembles rehearse, bands jam, sectionals sharpen specific parts. It\'s the rule, not the exception.',
    },
    standards: ['Performing'],
    impactValues: ['Community-Responsive', 'Accessible', 'Prosocial'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: shared practice space', contextNote: 'Use Studio as a group practice environment with backing tracks and shared visual reference.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'group-performance',
    title: 'Group Performance',
    phase: 'groupPractice',
    purpose: 'Performance',
    initiationStyle: 'join-the-expert',
    description:
      'Students perform an exercise, excerpt, or complete piece in small or large groups, successfully approximating the experience of expertise. The group format lets weaker and stronger players contribute side by side; the whole sounds better than any single part.',
    learningOutcome:
      'Students experience the lift of group performance — the way collective sound can exceed individual ability.',
    assessment: 'Performance: Did student participate?',
    clos: {
      awarenessOfFeeling:
        'I can muster the courage I need to participate in a group performance despite anxiety, fear, or resistance. I can practice a skill and competently perform it for my peers.',
      awarenessOfTechnique:
        'I can integrate my part into a group performance — adjusting my volume, timing, and confidence based on what\'s around me.',
      awarenessOfContext:
        'My performance is part of what makes a group performance more or less effective. An effective group performance integrates weaker and stronger individual performances into a cohesive whole.',
    },
    standards: ['Performing', 'Presenting'],
    impactValues: ['Inclusive', 'Prosocial', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: ensemble recording', contextNote: 'Record the group performance for review.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'community-songwriting',
    title: 'Community Songwriting',
    phase: 'groupPractice',
    purpose: 'Community Creativity',
    initiationStyle: 'join-the-expert',
    description:
      'The whole class writes a song together, with teacher facilitation. The teacher offers frameworks (a key center, a chord progression, a tempo, a topic) and students contribute musical and lyrical choices. Everyone gets a say. The end product is a class artifact, not any individual\'s.',
    learningOutcome:
      'Students experience songwriting as a collaborative, choice-driven process — and see how musical elements function like interchangeable building blocks.',
    assessment: 'Participation: Did student contribute their preferences or attention to the songwriting process?',
    clos: {
      awarenessOfFeeling:
        'When I work with my classmates to create a piece, I feel excited, curious, able to enjoy and just have fun, less self-conscious.',
      awarenessOfTechnique:
        'I can contribute a melodic idea, a lyric, a chord choice, or a rhythmic suggestion to a group composition — even if I\'m not sure it\'s "right."',
      awarenessOfContext:
        'Many musical elements — rhythm, style, chord progressions — can be used like interchangeable building blocks to create a song.',
    },
    standards: ['Creating', 'Performing', 'Connecting'],
    impactValues: ['Inclusive', 'Community-Responsive', 'Prosocial'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: class songwriting session', contextNote: 'Use Studio as the shared canvas for collecting class contributions.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'film-scoring-project',
    title: 'Film Scoring Project',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Students score a scene — a film clip, commercial, TV theme, video game cutscene, or sports highlight. Teacher facilitates listening to model scores, identifying functional elements (suspense, triumph, sadness, surprise), and executing the technical and creative work in Atlas Studio. Can be done individually or collectively.',
    learningOutcome:
      'Students apply musical techniques to a concrete, real-world purpose — and see how composers shape audience emotion second by second.',
    assessment: 'Participation and product: Did student engage consistently and contribute appropriate skills and ideas to the score?',
    clos: {
      awarenessOfFeeling:
        'When I match music to picture, I feel like a real composer — the music and the image are doing something neither could do alone.',
      awarenessOfTechnique:
        'I can imitate musical techniques, sounds, and effects to replicate specific music for media. For a superhero theme, I might use strings arpeggiating a minor triad with a minor 6th added as the foundation.',
      awarenessOfContext:
        'Film scoring is one of the largest employers of working composers today. Every commercial, show, and game you experience has someone scoring it.',
    },
    standards: ['Creating', 'Producing', 'Presenting'],
    impactValues: ['Modern', 'Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: video-sync scoring', contextNote: 'Studio supports scoring against a video clip — students see picture and write to it.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: film score conventions', contextNote: 'Hero themes, suspense cues, romantic underscores — the genre conventions of film scoring.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'soundscape-project',
    title: 'Soundscape Project',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Students learn about Musique Concrète and contemporary sound art. Teacher facilitates recording sounds from nature, daily life, and voices, then layering them in Atlas Studio with stereo panning and ambient effects to create a soundscape piece. The output is more sonic environment than song — but still music.',
    learningOutcome:
      'Students learn that music doesn\'t require traditional pitched instruments — and that the boundary between sound and music is a choice, not a rule.',
    assessment: 'Participation and product: Did student engage consistently with instruction and transfer skills and ideas to the project?',
    clos: {
      awarenessOfFeeling:
        'When I make music from sounds that weren\'t supposed to be music, I feel like I\'m breaking a rule I didn\'t know I was following.',
      awarenessOfTechnique:
        'I can use recording, production, and arranging techniques — layering, stereo panning, ambient effects — to turn non-musical sounds into a meaningful musical product.',
      awarenessOfContext:
        'From a different perspective, sound *is* music. Composers like Pierre Schaeffer, John Cage, and contemporary sound artists have been working this territory for a century.',
    },
    standards: ['Creating', 'Producing'],
    impactValues: ['Modern', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: layered soundscape composition', contextNote: 'Studio\'s multitrack environment is ideal for layering recorded environmental sounds.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'found-sound-production',
    title: 'Found Sound Music Production',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Students learn about electronic music production from found sounds. Teacher facilitates recording everyday objects, nature, voices — then chopping, pitching, time-stretching, panning, and reversing in Atlas Studio to create electronic music tracks built from raw recorded material.',
    learningOutcome:
      'Students discover that any sound is a potential instrument, and learn the core techniques of modern electronic music production.',
    assessment: 'Participation and product: Did student engage with instruction and transfer techniques into a track?',
    clos: {
      awarenessOfFeeling:
        'When I turn an everyday sound — a door closing, my voice, a coin spinning — into music, I feel like I\'m hearing the world differently than I did before.',
      awarenessOfTechnique:
        'I can use recording and production techniques — chopping, pitching, time-stretching, ambient effects, stereo panning, reversing — to make non-musical sounds part of musical pieces.',
      awarenessOfContext:
        'Everyday objects and sounds can be used as source material for music production. Artists from Imogen Heap to Kanye to Björk have built entire records this way.',
    },
    standards: ['Creating', 'Producing'],
    impactValues: ['Modern', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: found-sound production environment', contextNote: 'Studio supports importing field recordings and applying production techniques to them.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'sampling-project',
    title: 'Sampling Project',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Students learn the history of sampling and choose recordings to sample for their own creative projects. Teacher facilitates students using Atlas Studio to chop, pitch, and adjust the tempo of samples to create loops, then add other musical or lyrical layers on top.',
    learningOutcome:
      'Students learn one of the foundational techniques of modern music — and the cultural lineage that runs through Hip Hop, electronic, pop, and R&B.',
    assessment: 'Participation and product: Did student engage with instruction and transfer techniques into a sample-based track?',
    clos: {
      awarenessOfFeeling:
        'When I find a perfect sample and turn it into something new, I feel like I\'m in conversation with the artist who made the original.',
      awarenessOfTechnique:
        'I can use sampling and production techniques — chopping, pitching, time-stretching, ambient effects, stereo panning, reversing — to make new musical works from existing recordings.',
      awarenessOfContext:
        'Many great Hip Hop songs are largely constructed from samples of earlier great music — jazz, R&B, soul, funk. Sampling is its own art form and its own form of historical citation.',
    },
    standards: ['Creating', 'Producing', 'Connecting'],
    impactValues: ['Modern', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: sampling workflow', contextNote: 'Studio\'s sampler supports chop / pitch / time-stretch on imported audio.' },
      { module: 'globe', label: 'Atlas Globe: the lineage of sampled music', contextNote: 'Trace samples back to their originals — and the originals back to their sources.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'stylistic-loops',
    title: 'Stylistic Loops',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Teacher uses a stylistic lesson plan to facilitate specific techniques and rhythms on instruments or percussion. Class starts with a listening activity to identify stylistic elements, then students choose instruments and lock in a loop together — typically 2 or 4 bars — that captures the style.',
    learningOutcome:
      'Students embody a style by reproducing its signature loop — the smallest unit that still sounds like the tradition.',
    assessment: 'Performance: Did student lock into the loop with the group?',
    clos: {
      awarenessOfFeeling:
        'When I lock into a style loop with the group, I feel the style from the inside — not just hearing it, but being inside it.',
      awarenessOfTechnique:
        'I can play my part of a 2- or 4-bar stylistic loop in rhythm with the rest of the ensemble.',
      awarenessOfContext:
        'Most styles have a signature loop — the clave in Cuban music, the swing eighth in jazz, the boom-bap in hip hop, the four-on-the-floor in house. Learning the loop is learning the style.',
    },
    standards: ['Performing', 'Responding', 'Connecting'],
    impactValues: ['Accessible', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: stylistic loops', contextNote: 'Each genre lesson includes its signature loop with notation.' },
      { module: 'studio', label: 'Atlas Studio: lock in with a backing track', contextNote: 'Loop a style track and play along.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'create-a-hook',
    title: 'Melody: Create a Hook',
    phase: 'groupPractice',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students listen to a hook melody — e.g., Post Malone\'s "Sunflower" from Spider-Verse — and learn to play it. Then they choose a key center; teacher provides reference scales (major and pentatonic) via Atlas Theory; students are tasked with creating their own 1- or 2-bar hook melody. Teacher helps students individually on headphones.',
    learningOutcome:
      'Students learn that a hook is a small, memorable melodic idea — and that they can write one.',
    assessment: 'Output: Did student produce a 1- or 2-bar original melody?',
    clos: {
      awarenessOfFeeling:
        'When I write a hook that I actually want to hum to myself, I feel like a real songwriter — even if it\'s only two bars long.',
      awarenessOfTechnique:
        'I can write a 1- or 2-bar melody by choosing a key center and selecting notes from the major or pentatonic scale to shape into a memorable phrase.',
      awarenessOfContext:
        'Pop music lives and dies by the hook. Songwriters from Max Martin to Mariah Carey have built careers on the ability to write a melody you can\'t forget.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Modern', 'Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: hook writing template', contextNote: 'Quick 4-bar template with a chord progression underneath; students drop their hook on top.' },
      { module: 'theory-lesson', label: 'Atlas Theory: scales for melody writing', contextNote: 'Major and pentatonic scales as melodic resources.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'chords-in-rhythm',
    title: 'Create a Rhythm: Chords in Rhythm',
    phase: 'groupPractice',
    purpose: 'Composition',
    initiationStyle: 'learn-to-apply',
    description:
      'Students come up with a word or short phrase and put it to rhythm — speak it, then clap it, then play it. They perform one chord in that rhythm. Then expand to 2 chords over 4 bars, then 4 chords over 4 bars, and eventually an 8-bar structure. Rhythmic invention from spoken language.',
    learningOutcome:
      'Students discover that rhythm comes from speech, and that they can generate musical rhythms from any word or phrase that matters to them.',
    assessment: 'Output: Did student create and perform a rhythmic chord pattern derived from a phrase?',
    clos: {
      awarenessOfFeeling:
        'When I turn a phrase I made up into a rhythm, the rhythm feels personal — like my voice is hiding inside the chord.',
      awarenessOfTechnique:
        'I can take a word or phrase, find its natural rhythm, and play a chord in that rhythm. I can extend the idea to 2 chords, 4 chords, or a full 8-bar progression.',
      awarenessOfContext:
        'Rhythm originates in speech and breath. From West African talking drums to hip hop flow, music has always been built from the rhythms of language.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Inclusive', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: rhythmic chord sketches', contextNote: 'Record the rhythmic pattern and loop it.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'create-a-bass-line',
    title: 'Create a Bass Line',
    phase: 'groupPractice',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students learn an existing bass line from a relevant song or style on the low/left side of the keyboard, or the bottom strings of bass or guitar. Then they create their own bass line within a key center or over a given chord progression. Students take turns jamming with a play-along or instructor and collaborate with peers who are creating chords, melodies, or rhythms.',
    learningOutcome:
      'Students learn that the bass line is the engine of a song, and that writing a good one is a discipline of restraint and rhythmic feel.',
    assessment: 'Output: Did student create and perform a bass line that locks into a given context?',
    clos: {
      awarenessOfFeeling:
        'When my bass line locks in with the drums, I feel the song lift off the ground.',
      awarenessOfTechnique:
        'I can write a bass line by anchoring chord roots on strong beats and using passing tones, octave jumps, or rhythmic syncopation to add motion.',
      awarenessOfContext:
        'The bass line is the foundation of most modern music. From James Jamerson at Motown to Pino Palladino to Thundercat, bass players define the feel of a record.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Accessible', 'Modern'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: bass-line sketchpad', contextNote: 'Loop a drum and chord track and write a bass line over it.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: bass line conventions per style', contextNote: 'Walking bass in jazz, root-fifth in country, syncopated in funk, etc.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'create-a-chord-progression',
    title: 'Create a Chord Progression',
    phase: 'groupPractice',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students explore common chord progressions (I–V–vi–IV, ii–V–I, 12-bar blues, doo-wop changes) and then craft their own. Start with diatonic options in a chosen key, then introduce borrowed chords or modal interchange for color. Pair with a melody or rhythm pattern from earlier activities.',
    learningOutcome:
      'Students understand that chord progressions are recipes — there are common ones for good reasons, and they can author their own.',
    assessment: 'Output: Did student create a chord progression they can perform or program?',
    clos: {
      awarenessOfFeeling:
        'When I find the right chord progression, the emotion of the song comes into focus — the chords are doing as much work as the lyrics.',
      awarenessOfTechnique:
        'I can write a 4- or 8-bar chord progression in a chosen key using diatonic chords, and I know how to add color with borrowed or chromatic chords.',
      awarenessOfContext:
        'A few chord progressions are the foundation of huge amounts of popular music. The I–V–vi–IV is in hundreds of pop songs. Learning to recognize and write progressions is foundational.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Accessible', 'Modern'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: chord progression library', contextNote: 'Common progressions across styles, with examples.' },
      { module: 'studio', label: 'Atlas Studio: chord progression sketchpad', contextNote: 'Lay down chord changes and loop them.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'collaborate-in-duos',
    title: 'Collaborate in Duos',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'try-it-first',
    description:
      'Students pair up to work on a short piece — one writes a melody, the other writes a bass line; one chords, the other improvises; one beats, the other raps. The duo format makes collaboration intimate, low-stakes, and high-feedback.',
    learningOutcome:
      'Students experience musical collaboration at its smallest scale — and learn to negotiate, listen, and combine ideas.',
    assessment: 'Output and participation: Did the duo produce something they can play or record together?',
    clos: {
      awarenessOfFeeling:
        'When I collaborate with a partner who has different strengths than me, I feel like the music is bigger than either of us could have made alone.',
      awarenessOfTechnique:
        'I can coordinate my musical part with a partner\'s — adjusting rhythm, register, dynamics, and timing so we sound good together.',
      awarenessOfContext:
        'Duos are everywhere — Lennon-McCartney, Daft Punk, Outkast, Simon and Garfunkel. Two-person creative partnerships have produced some of the most enduring music.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: duo session template', contextNote: 'A 2-track template designed for two collaborators.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'collaborate-in-small-groups',
    title: 'Collaborate in Small Groups',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'try-it-first',
    description:
      'Students form small groups (3–5) and work on a short piece together. Roles can be assigned (performer, producer, lyricist, marketer) or emergent. Each group makes choices, divides labor, and produces an artifact in the time given.',
    learningOutcome:
      'Students learn to navigate the dynamics of a small creative team — listening, advocating, compromising, and finishing.',
    assessment: 'Output and participation: Did the group produce a shared artifact? Did each member contribute?',
    clos: {
      awarenessOfFeeling:
        'When a small group I\'m in finishes something together, I feel proud in a different way than when I make something alone — there are layers I couldn\'t have added myself.',
      awarenessOfTechnique:
        'I can contribute a specific skill or role to a small creative team — playing my part, voicing my opinion, supporting someone else\'s idea.',
      awarenessOfContext:
        'Most working bands and creative teams are 3–5 people. Learning to make music in a small group is learning to make music in the real world.',
    },
    standards: ['Creating', 'Performing', 'Presenting'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: small-group project space', contextNote: 'Shared multitrack project with role assignments.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'teach-your-peers',
    title: 'Teach Your Peers',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'try-it-first',
    description:
      'A student who knows a technique, song, or concept teaches it to two or three classmates. The teacher\'s job is to set up the structure and step back. Teaching what you know is one of the fastest ways to know it deeply.',
    learningOutcome:
      'Students consolidate their own learning by teaching it — and develop the meta-skill of breaking a concept down for someone else.',
    assessment: 'Output: Did the teaching student produce a peer who can do or recognize the thing? Did the peers improve?',
    clos: {
      awarenessOfFeeling:
        'When I teach something I know to a classmate, I feel my own understanding click into place in a new way — and I get to be the expert for a minute.',
      awarenessOfTechnique:
        'I can explain a technique or concept clearly enough that a peer can do it themselves. I can break it into steps and adjust based on what they\'re struggling with.',
      awarenessOfContext:
        'Peer teaching is one of the most effective learning methods we know of. Many musicians learn primarily from each other, not from formal instruction.',
    },
    standards: ['Performing', 'Connecting'],
    impactValues: ['Prosocial', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: source material for peer teaching', contextNote: 'Students can reference Atlas Theory while teaching peers a concept.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'musical-structures-loops',
    title: 'Musical Structures: Loops',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students learn to recognize and construct 2-bar loops, 4-bar loops, and 8-bar sections — the building blocks of most popular music. Teacher demonstrates each scale and has students count along, then build their own loops at each length using Atlas Studio.',
    learningOutcome:
      'Students develop an architectural sense of musical time — knowing where they are in a 2-bar loop vs. an 8-bar section, and what each scale is good for.',
    assessment: 'Output: Did student build and play loops at each of the three lengths?',
    clos: {
      awarenessOfFeeling:
        'When I can feel where I am in a loop, music stops feeling like a wash and starts feeling like a place I can move around in.',
      awarenessOfTechnique:
        'I can construct a 2-bar loop, a 4-bar loop, and an 8-bar section. I know that most pop songs are organized in 4- and 8-bar sections.',
      awarenessOfContext:
        'Different styles favor different loop lengths. House music lives in 8-bar phrases; hip hop often in 4-bar loops; folk in 8- or 16-bar verses. Knowing the convention is knowing the style.',
    },
    standards: ['Performing', 'Creating', 'Responding'],
    impactValues: ['Accessible', 'Modern'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: loop construction', contextNote: 'Build loops at different lengths and see them visually.' },
      { module: 'theory-lesson', label: 'Atlas Theory: musical phrase lengths', contextNote: 'Why 4- and 8-bar phrases are so common.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'musical-structures-song-form',
    title: 'Musical Structures: Song Form',
    phase: 'groupPractice',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students learn to map and construct full song forms — verse-chorus, verse-chorus-bridge, AABA, 12-bar blues, through-composed. Teacher plays examples and students label sections in real time; then students build their own form in Atlas Studio.',
    learningOutcome:
      'Students see the song as an architecture — understanding why bridges feel like bridges and why a chorus that returns feels like home.',
    assessment: 'Output: Did student correctly label sections in a recording? Did they build their own song form?',
    clos: {
      awarenessOfFeeling:
        'When I notice the form of a song — the chorus coming back, the bridge taking us somewhere new — I feel like I\'m hearing the architecture of the song, not just the surface.',
      awarenessOfTechnique:
        'I can identify and construct standard song forms: verse-chorus, verse-chorus-bridge, AABA, 12-bar blues. I can label sections in a recording in real time.',
      awarenessOfContext:
        'Song forms are conventions — many of them inherited from earlier traditions. The 12-bar blues comes from African American folk traditions; AABA from Tin Pan Alley; verse-chorus from contemporary pop.',
    },
    standards: ['Creating', 'Responding', 'Connecting'],
    impactValues: ['Accessible', 'Community-Responsive', 'Modern'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: song forms by style', contextNote: 'Each genre lesson covers its typical song forms.' },
      { module: 'studio', label: 'Atlas Studio: section-aware composition', contextNote: 'Studio supports building a song by section.' },
      { module: 'theory-lesson', label: 'Atlas Theory: song forms in history', contextNote: 'Where these forms come from.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'class-recording-project',
    title: 'Class Recording Project',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Big goal: the class produces an album together over a semester or year. Across the project, students apply music fundamentals (rhythm, harmony, melody, song form, lyrics), learn cover songs, write original songs, record them, mix and master in Atlas Studio, create artwork, and perform the result. Roles can rotate across songs.',
    learningOutcome:
      'Students execute a complete music industry workflow — from initial idea through performance — as part of a community of artists.',
    assessment: 'Output and process: Did the album get made? Did each student contribute meaningful work? Did the project teach what it was supposed to teach?',
    clos: {
      awarenessOfFeeling:
        'When my class finishes an album together, I feel like part of something bigger than just my own work — I helped make this real thing exist.',
      awarenessOfTechnique:
        'I can apply music fundamentals — rhythm, harmony, melody, song form, lyrics — in the context of an actual recording. I can play a role in production, performance, or one of the support roles.',
      awarenessOfContext:
        'A class album is a microcosm of how music actually gets made — with deadlines, division of labor, creative disagreements, and a finished artifact at the end.',
    },
    standards: ['Creating', 'Performing', 'Producing', 'Presenting', 'Connecting'],
    impactValues: ['Inclusive', 'Modern', 'Community-Responsive', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: shared album project', contextNote: 'A multitrack project that holds the whole class album.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: production conventions', contextNote: 'Reference for how albums in different styles are produced.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'create-a-soundtrack',
    title: 'Create a Soundtrack',
    phase: 'groupPractice',
    purpose: 'Music Industry Application',
    initiationStyle: 'hybrid',
    description:
      'Find a story or a few stories to choose from with the class, and make music from it. Either: (1) create a backing track, soundscape, or instrumental soundtrack in Atlas Studio; or (2) use the story as a springboard for songwriting. Can be done as a class, in groups, or with short poems assigned to small groups.',
    learningOutcome:
      'Students translate narrative into music — building on the listening work where they learned how composers tell stories.',
    assessment: 'Output: Did the class produce a soundtrack that responds to the story?',
    clos: {
      awarenessOfFeeling:
        'When I write music to a story, I feel like I\'m collaborating with the writer — adding something the words couldn\'t say.',
      awarenessOfTechnique:
        'I can match musical choices — tempo, instrumentation, dynamics, mode — to specific moments in a narrative.',
      awarenessOfContext:
        'Soundtrack composition is its own discipline. Composers like Hildur Guðnadóttir, Hans Zimmer, and Ryuichi Sakamoto have built careers on the ability to score stories.',
    },
    standards: ['Creating', 'Producing'],
    impactValues: ['Modern', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: narrative scoring template', contextNote: 'Match musical sections to story beats.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  /* ---- Classroom games and therapeutic activities (within Group Practice) ---- */

  {
    id: 'song-mosaic',
    title: 'Song Mosaic',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'A community composition project: participants contribute individual musical elements that are woven together into a single cohesive piece. Each student brings one fragment — a 2-bar melody, a chord, a lyric, a percussion pattern. The class assembles them into a song in Atlas Studio.',
    learningOutcome:
      'Students experience how small individual contributions become a collective whole — and that everyone\'s voice has a place in the mosaic.',
    assessment: 'Output: Did the class produce a finished mosaic? Did every student\'s contribution appear in the final?',
    clos: {
      awarenessOfFeeling:
        'When my one small fragment becomes part of a finished class song, I feel my contribution mattered — even if it was tiny.',
      awarenessOfTechnique:
        'I can contribute a small, focused musical element designed to fit alongside many others.',
      awarenessOfContext:
        'Many musical traditions are built from small contributions — call-and-response, gamelan ensembles, choral music. The mosaic is how a community sings together.',
    },
    standards: ['Creating', 'Performing', 'Connecting'],
    impactValues: ['Inclusive', 'Community-Responsive', 'Prosocial'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: collaborative project', contextNote: 'Shared canvas for the mosaic.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'melody-tapestry',
    title: 'Melody Tapestry',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'Students weave notes together to create a new melodic phrase. Each student plays one note or one small motif, in turn, building a longer melodic line cooperatively. Encourages listening, decision-making, and surrender to the group.',
    learningOutcome:
      'Students learn that melody is a sequence of intentional choices — and that good melodies emerge from listening to what came just before.',
    assessment: 'Participation: Did student play their note or phrase in turn, listening to the group?',
    clos: {
      awarenessOfFeeling:
        'When I add my note to a melody other students are building, I feel both responsible and freed — the melody is bigger than any of us.',
      awarenessOfTechnique:
        'I can listen to what just played and respond with a note or phrase that continues or shapes the line.',
      awarenessOfContext:
        'Cooperative melody-building is the basis of much improvised music. Jazz trading, raga building, group cadenzas — the tapestry is everywhere.',
    },
    standards: ['Creating', 'Performing', 'Responding'],
    impactValues: ['Prosocial', 'Inclusive', 'Accessible'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'sound-collage',
    title: 'Sound Collage',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'Students use audio samples to create new ideas — combining them in unexpected ways. Each student selects 2–3 samples from a shared pool (or records their own); the class assembles a collage in Atlas Studio that combines all contributions into a single sonic landscape.',
    learningOutcome:
      'Students experiment with the boundaries of music vs. noise, and learn that juxtaposition is itself a creative act.',
    assessment: 'Output: Did the class produce a collage that combines diverse contributions?',
    clos: {
      awarenessOfFeeling:
        'When unrelated sounds end up next to each other in a collage, I sometimes hear connections nobody intended — the work surprises us.',
      awarenessOfTechnique:
        'I can layer, sequence, pan, and effect sound samples in Atlas Studio to create a coherent collage.',
      awarenessOfContext:
        'Sound collage has a long art-music history — Schaeffer, Stockhausen, Cage — and a strong pop history too, in hip hop and electronic music.',
    },
    standards: ['Creating', 'Producing'],
    impactValues: ['Modern', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: collage canvas', contextNote: 'Multitrack environment for sample layering.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'heartbeat-circle',
    title: 'Heartbeat Circle',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'join-the-expert',
    description:
      'A therapeutic drum circle that creates a safe, inclusive space for participants to connect with themselves and each other through rhythm. The steady beat provides a grounding effect; the group rhythm provides connection. Use frame drums, djembes, hand drums, or even body percussion. No music-reading required.',
    learningOutcome:
      'Students experience drumming as a regulating, community-building practice — and discover that they don\'t need to "be a musician" to participate.',
    assessment: 'Participation: Did student join the circle and play in some form?',
    clos: {
      awarenessOfFeeling:
        'When I\'m in a drum circle, I feel calmer and more connected — like the rhythm is doing something for my body that I couldn\'t do alone.',
      awarenessOfTechnique:
        'I can find a simple steady pulse and contribute to a group rhythm without needing to read music.',
      awarenessOfContext:
        'Drum circles are an old, cross-cultural practice — present in West Africa, Native American traditions, Sufi practices, and contemporary therapy settings.',
    },
    standards: ['Performing', 'Connecting'],
    impactValues: ['Therapeutic', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: drum traditions of the world', contextNote: 'After the circle, explore the traditions that drum circles emerged from.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'rhythm-respiration',
    title: 'Rhythm Respiration',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'learn-to-apply',
    description:
      'Students combine box breathing with a 4/4 time signature. Each phase of the breath (in / hold / out / hold) aligns with one beat of a 4-count measure. Music plays in slow tempo (60 bpm) to anchor the cycle. A meditative, body-aware practice.',
    learningOutcome:
      'Students integrate breath and rhythm into one practice — bringing nervous-system regulation directly into musical time.',
    assessment: 'Participation: Did student attempt to align breath and beat?',
    clos: {
      awarenessOfFeeling:
        'When I align my breath with the beat, I feel my whole body settle into the music in a way that doesn\'t happen with breath or music alone.',
      awarenessOfTechnique:
        'I can synchronize a 4-count breath cycle with a 4/4 musical pulse at slow tempo.',
      awarenessOfContext:
        'Breath and rhythm are inseparable in many musical traditions — South Indian raga, Sufi zikr, Tibetan throat singing. Music has always known the body.',
    },
    standards: ['Performing', 'Connecting'],
    impactValues: ['Therapeutic', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: slow-tempo backing track', contextNote: 'Use a 60-bpm Studio track as the breath/rhythm anchor.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'phantom-of-the-anthem',
    title: 'Phantom of the Anthem',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'One student is secretly tapped to play a melody over a backing track. The rest of the class listens and tries to guess who played. Develops listening, improvisation, and musical memory.',
    learningOutcome:
      'Students learn to listen for individual character in performance — and to play with confidence even when they\'re not sure who\'s watching.',
    assessment: 'Participation: Did student play their phrase when tapped, and listen attentively otherwise?',
    clos: {
      awarenessOfFeeling:
        'When I\'m the secret player, I feel braver than I expected — and when I\'m the listener, I notice details about my classmates\' playing I never noticed before.',
      awarenessOfTechnique:
        'I can improvise a short melody over a backing track. I can listen for individual character — touch, timing, note choice — in a performance.',
      awarenessOfContext:
        'Every musician has a sound. Even within the same instrument, the same scale, the same key — you can hear the person.',
    },
    standards: ['Performing', 'Responding'],
    impactValues: ['Prosocial', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: backing tracks for the game', contextNote: 'Loop a Studio track as the bed.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'multiverse',
    title: 'Multiverse',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'Class divides in two — one group creates chord progressions for a verse, the other group creates pentatonic-scale melodies. Then students switch partners and groups, playing their chords and melodies together to form a complete composition. Several rotations build a class library of mix-and-match musical material.',
    learningOutcome:
      'Students experience how melody and harmony combine modularly — that many melodies can fit one chord progression, and many progressions can support one melody.',
    assessment: 'Output and participation: Did each student produce chords or melody, and did pairs combine them?',
    clos: {
      awarenessOfFeeling:
        'When my melody works over a chord progression I\'ve never heard before, I feel like the music is happening to me, not from me.',
      awarenessOfTechnique:
        'I can write a chord progression in a key, or a pentatonic melody in a key, and combine them with a partner\'s work.',
      awarenessOfContext:
        'Most popular music is modular — the same chord progressions support many melodies, the same melodies sit over many chord progressions. Recognizing this is recognizing how songs get built.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Prosocial', 'Accessible', 'Modern'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: chord + melody combiner', contextNote: 'Two tracks — chords and melody — that any pair can populate.' },
      { module: 'theory-lesson', label: 'Atlas Theory: pentatonic scales', contextNote: 'The pentatonic scale and why it works over so many chord changes.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'volume-voyage',
    title: 'Volume Voyage',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'A musical hot-and-cold game. One student leaves the room; another hides an object. When the seeker returns, the class plays music to guide them — louder as they approach the object, softer as they move away. Teaches dynamics as a communicative tool.',
    learningOutcome:
      'Students experience dynamics as expressive information — and learn to control their volume responsively to a real-time situation.',
    assessment: 'Participation: Did student participate as seeker and/or class musician?',
    clos: {
      awarenessOfFeeling:
        'When I\'m the seeker following the volume of the music, I feel like the class is guiding me with sound — like the dynamics are speaking.',
      awarenessOfTechnique:
        'I can control my dynamics — loud, soft, and gradients between — responsively in real time.',
      awarenessOfContext:
        'Dynamics are one of music\'s most powerful expressive tools. A whisper followed by a shout can move an audience more than any note choice.',
    },
    standards: ['Performing', 'Responding'],
    impactValues: ['Inclusive', 'Prosocial', 'Accessible'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'tempo-tag',
    title: 'Tempo Tag',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'A music-driven version of tag. Students must move their bodies to a quarter-note pulse — and tag other students — while the instructor adjusts the tempo unpredictably. Sudden slowdowns and accelerations force students to recalibrate their movement in real time.',
    learningOutcome:
      'Students embody changing tempo with their whole body — building rhythmic flexibility and physical timing awareness.',
    assessment: 'Participation: Did student move with the pulse and adjust to tempo changes?',
    clos: {
      awarenessOfFeeling:
        'When the tempo changes and I have to adjust, I feel my body and the music having to negotiate — it\'s funny, it\'s focused, it\'s alive.',
      awarenessOfTechnique:
        'I can move my body in time to a pulse, and adjust my movement when the tempo changes.',
      awarenessOfContext:
        'Tempo changes are everywhere in real music — rubato, accelerandos, ritardandos, modulating grooves. The body has to be ready.',
    },
    standards: ['Performing'],
    impactValues: ['Inclusive', 'Accessible', 'Prosocial'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: tempo control', contextNote: 'Studio can change tempo in real time — useful for running this game.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'sound-maze',
    title: 'Sound Maze',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'An ear-training game. One student is blindfolded at one end of a marked maze; classmates spread out through the maze, each playing a unique sound (bell, shaker, drum). The blindfolded student must navigate by sound alone. Variations: switch sounds mid-game, add time limits, change positions.',
    learningOutcome:
      'Students develop spatial listening — the ability to locate and track sounds in three-dimensional space.',
    assessment: 'Participation: Did student attempt to navigate by sound, or hold a sound for a navigator?',
    clos: {
      awarenessOfFeeling:
        'When I navigate the maze with only my ears, I feel my sense of hearing become primary in a way it almost never is.',
      awarenessOfTechnique:
        'I can identify the direction a sound is coming from, and track its source as I move.',
      awarenessOfContext:
        'Spatial hearing is one of the brain\'s oldest skills — and it\'s why stereo and surround production matter so much in modern music.',
    },
    standards: ['Responding', 'Performing'],
    impactValues: ['Accessible', 'Inclusive', 'Prosocial'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'chord-charades',
    title: 'Chord Charades',
    phase: 'groupPractice',
    purpose: 'Game / Activity',
    initiationStyle: 'join-the-expert',
    description:
      'Teacher (or student) plays a chord, then acts out the emotion that chord conveys — happiness, sadness, excitement, tranquility, mystery. Class guesses the emotion. Starts with major and minor triads, advances to 7th chords, suspensions, and modal chords.',
    learningOutcome:
      'Students train their ear to identify chord quality by emotional fingerprint — and learn the affective language of harmony.',
    assessment: 'Participation: Did student guess the emotion or play a chord-with-emotion themselves?',
    clos: {
      awarenessOfFeeling:
        'When I learn that a specific chord quality has a specific feel, I start hearing those colors in every song I listen to.',
      awarenessOfTechnique:
        'I can identify the quality of a chord — major, minor, 7th, suspended — by its sound, not just by knowing its name.',
      awarenessOfContext:
        'Chord-quality recognition is the foundation of jazz harmony, gospel music, and contemporary songwriting. The vocabulary is universal across modern styles.',
    },
    standards: ['Responding', 'Performing'],
    impactValues: ['Accessible', 'Inclusive', 'Prosocial'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: chord qualities and their emotional fingerprints', contextNote: 'Reference material for the game.' },
      { module: 'arcade', label: 'Atlas Arcade: chord ear-training games', contextNote: 'Solo practice version of the same skill.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'lyric-canvas',
    title: 'Lyric Canvas',
    phase: 'groupPractice',
    purpose: 'Community Creativity',
    initiationStyle: 'try-it-first',
    description:
      'Students look at visual artwork and write lyrics inspired by it. Teacher provides paintings, photographs, sculptures, or other visual art. Students reflect on the artwork\'s themes, mood, and details, then write lyrics that capture or respond to it. Share and discuss at the end.',
    learningOutcome:
      'Students cross-train between visual and lyrical art — using one medium to access the other, and discovering that they share emotional vocabulary.',
    assessment: 'Output: Did student produce lyrics in response to the artwork?',
    clos: {
      awarenessOfFeeling:
        'When I write lyrics in response to a painting, I find words I wouldn\'t have found from looking at a blank page — the image is doing some of the work.',
      awarenessOfTechnique:
        'I can study a piece of visual art and translate what I see into lyrics that capture its mood, story, or theme.',
      awarenessOfContext:
        'Cross-disciplinary creative response is a real artistic practice. Joni Mitchell painted what she heard; Patti Smith wrote what she saw. The disciplines feed each other.',
    },
    standards: ['Creating', 'Connecting'],
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: cross-disciplinary art collections', contextNote: 'Curated visual art available for lyric prompts.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },


  /* ============================================================
     PHASE 3: CREATIVE PROJECTS
     ============================================================ */

  {
    id: 'two-hand-lh-chord-rh-melody',
    title: 'Two-Hand Coordination: LH Chord, RH Melody',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students developing two-hand independence on the keyboard learn to play a chord with their left hand while playing a melody with their right hand. Start with one chord and a 4-note melody, then expand. Slow practice with steady pulse is essential.',
    learningOutcome:
      'Students achieve the foundational coordination of playing harmony and melody together — the basis of most keyboard music.',
    assessment: 'Performance: Did student play LH chord + RH melody at a steady tempo with reasonable accuracy?',
    clos: {
      awarenessOfFeeling:
        'When my hands first stop fighting each other and play together, I feel like I unlocked something my brain didn\'t know it could do.',
      awarenessOfTechnique:
        'I can play a sustained or repeated chord in my left hand while playing an independent melody in my right hand at a steady tempo.',
      awarenessOfContext:
        'Two-hand independence is the basic foundation of keyboard music in nearly every style — from Bach to Bill Evans to Billie Eilish productions.',
    },
    standards: ['Performing'],
    impactValues: ['Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: practice with a metronome', contextNote: 'Slow practice with click is essential.' },
      { module: 'theory-lesson', label: 'Atlas Theory: chord voicings for the left hand', contextNote: 'Common left-hand chord voicings.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'two-hand-lh-bass-rh-melody',
    title: 'Two-Hand Coordination: LH Bass Line, RH Melody',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students play a moving bass line with their left hand while playing a melody with their right hand. Requires real two-hand independence since both hands have rhythmic motion. Start simple — root-fifth bass line, simple melody — and build.',
    learningOutcome:
      'Students develop independence of moving lines in both hands — the next step beyond static chord support.',
    assessment: 'Performance: Did student play moving LH bass + RH melody at a steady tempo?',
    clos: {
      awarenessOfFeeling:
        'When I can play a walking bass line under my own melody, I feel like a one-person band.',
      awarenessOfTechnique:
        'I can play a moving bass line with my left hand and an independent melody with my right hand at a steady tempo.',
      awarenessOfContext:
        'This texture — bass and melody in two hands — has been a foundational piano idiom from Baroque to stride to gospel to contemporary pop.',
    },
    standards: ['Performing'],
    impactValues: ['Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: practice with backing track', contextNote: 'Play LH + RH against a drum track to lock in rhythm.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'two-hand-lh-bass-rh-chord',
    title: 'Two-Hand Coordination: LH Bass Line, RH Chord',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students play a bass line in their left hand while playing chords in their right hand. The classic rhythm-section keyboard texture. Start with simple root-fifth bass and triadic chords; build to walking bass with extended chord voicings.',
    learningOutcome:
      'Students develop the rhythm-section keyboard role — bass and chords in two hands, the way most professional comping is structured.',
    assessment: 'Performance: Did student play LH bass + RH chords at a steady tempo?',
    clos: {
      awarenessOfFeeling:
        'When I can comp bass and chords at the same time, I feel like I can accompany any singer or instrumentalist — I\'m a whole rhythm section by myself.',
      awarenessOfTechnique:
        'I can play an independent bass line with my left hand and rhythmically articulated chords with my right hand.',
      awarenessOfContext:
        'This is the core skill of a comping keyboard player in jazz, R&B, gospel, soul, and rock. It\'s also how solo pianists support themselves.',
    },
    standards: ['Performing'],
    impactValues: ['Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: comping practice', contextNote: 'Play LH + RH along with a melody track.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: comping styles', contextNote: 'How comping varies across jazz, gospel, R&B, etc.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'two-hand-lh-bass-rh-stylistic',
    title: 'Two-Hand Coordination: LH Bass Line, RH Stylistic Technique',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'learn-to-apply',
    description:
      'Students play a bass line with their left hand while playing a stylistic technique (montuno, gospel chord-melody, salsa tumbao, jazz comping) with their right hand. Combines technical independence with stylistic vocabulary.',
    learningOutcome:
      'Students integrate stylistic technique into a real two-hand context — the way professional players actually play.',
    assessment: 'Performance: Did student execute LH bass + RH stylistic technique with reasonable accuracy?',
    clos: {
      awarenessOfFeeling:
        'When I can play a montuno in my right hand and a tumbao in my left, I feel the style come alive under my hands.',
      awarenessOfTechnique:
        'I can play a stylistic right-hand technique (montuno, comping, gospel runs) on top of an independent left-hand bass line.',
      awarenessOfContext:
        'This integration is what separates a student of a style from a player of a style. Real performance lives at the intersection of independence and idiom.',
    },
    standards: ['Performing', 'Connecting'],
    impactValues: ['Accessible', 'Community-Responsive', 'Empowerment'],
    atlasResources: [
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: full two-hand examples', contextNote: 'Each genre lesson shows the two-hand context for its techniques.' },
      { module: 'studio', label: 'Atlas Studio: practice with rhythm section', contextNote: 'Play along with drums to lock in.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'improvisation-beginner',
    title: 'Improvisation (Beginner)',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'try-it-first',
    description:
      'Students identify one note from a key center and improvise short rhythmic phrases using only that one note while the teacher or backing track plays a groove underneath. The constraint of one note unlocks rhythmic creativity and removes the fear of "wrong notes."',
    learningOutcome:
      'Students discover that improvisation is fundamentally about rhythm and phrasing — and that they can improvise with very little pitch material.',
    assessment: 'Performance: Did student improvise rhythmic phrases on the assigned note over the groove?',
    clos: {
      awarenessOfFeeling:
        'When I improvise with just one note, I feel freed — there\'s nothing to be wrong about, so I can pay attention to how the phrase feels.',
      awarenessOfTechnique:
        'I can improvise short rhythmic phrases on a single note over a groove, varying duration, accent, and placement within the beat.',
      awarenessOfContext:
        'Many great solos use very few pitches. Miles Davis was famous for it. The rhythm and phrasing are where the music lives.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Accessible', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: groove backing tracks', contextNote: 'Loop a Studio groove for solo practice.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'improvisation-conversation',
    title: 'Improvisation Conversation',
    phase: 'creativeProjects',
    purpose: 'Collaboration',
    initiationStyle: 'try-it-first',
    description:
      'Two students trade improvised phrases back and forth within a simple structure while a backing track plays. The rule: each phrase should respond to the one before it. Develops listening, call-and-response, and musical dialogue.',
    learningOutcome:
      'Students experience improvisation as conversation — and learn that good soloing is responsive, not just self-expressive.',
    assessment: 'Performance: Did student trade phrases that responded to their partner\'s phrases?',
    clos: {
      awarenessOfFeeling:
        'When I trade phrases with someone and they really respond to what I just played, I feel like we\'re actually talking — through music.',
      awarenessOfTechnique:
        'I can improvise a short phrase, listen to a partner\'s response, and shape my next phrase based on theirs.',
      awarenessOfContext:
        'Call-and-response is foundational to jazz, blues, gospel, hip hop, and West African music. The "trade fours" of a jazz solo is a direct descendant of African oral tradition.',
    },
    standards: ['Creating', 'Performing', 'Responding'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: trading backing tracks', contextNote: 'Loop a section that gives clear "trade" markers.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'improvisation-telephone',
    title: 'Improvisation Telephone',
    phase: 'creativeProjects',
    purpose: 'Game / Activity',
    initiationStyle: 'try-it-first',
    description:
      'A student improvises a short phrase within agreed parameters (one note, two notes, a starting note within a scale, blues scale, etc.). Like the children\'s game "telephone," each subsequent student around the circle tries to play the same phrase. The phrase mutates as it travels. Great for developing musical memory and ear.',
    learningOutcome:
      'Students train their musical ear by attempting to reproduce what they just heard — and they laugh at how phrases evolve.',
    assessment: 'Performance: Did student attempt to reproduce the phrase they heard?',
    clos: {
      awarenessOfFeeling:
        'When I have to reproduce a phrase by ear, I notice how much of what I "heard" was actually me filling in gaps. The game is funny because we\'re all doing it.',
      awarenessOfTechnique:
        'I can listen to a short improvised phrase and reproduce it on my instrument with reasonable accuracy.',
      awarenessOfContext:
        'Most music is learned by ear before it\'s learned by notation. The telephone game compresses generations of oral tradition into 30 seconds.',
    },
    standards: ['Performing', 'Responding'],
    impactValues: ['Prosocial', 'Inclusive', 'Accessible'],
    atlasResources: [],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'improvisation-intermediate',
    title: 'Improvisation (Intermediate)',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'try-it-first',
    description:
      'Students improvise short phrases using notes from a specific chord while a backing track plays. Variation: students "approach" a target note in a chord from above, below, or both (enclosure). Builds harmonic awareness in improvisation.',
    learningOutcome:
      'Students learn to improvise with harmonic intention — choosing notes that connect to the underlying chords rather than just running scales.',
    assessment: 'Performance: Did student improvise phrases that landed on or approached chord tones?',
    clos: {
      awarenessOfFeeling:
        'When I land on a chord tone after approaching it from above and below, I feel a satisfaction that\'s different from just running a scale — the line went somewhere.',
      awarenessOfTechnique:
        'I can improvise phrases that target chord tones, using approach notes (chromatic, scalar, enclosures) to add motion and direction.',
      awarenessOfContext:
        'Approach and enclosure are central techniques in bebop and modern jazz improvisation. Charlie Parker built his vocabulary on them.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Modern', 'Accessible', 'Empowerment'],
    atlasResources: [
      { module: 'theory-lesson', label: 'Atlas Theory: chord tones and approach notes', contextNote: 'The theory behind targeting and approaching.' },
      { module: 'studio', label: 'Atlas Studio: chord-cycling backing tracks', contextNote: 'Loop chord changes for solo practice.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'individual-practicing',
    title: 'Individual Practicing',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'self-guided',
    description:
      'Students work individually on specific skills or projects, with intermittent teacher oversight, feedback, and advising. Teacher provides a framework for practice strategy — slow practice, isolated problem spots, looping with the metronome, and reflection.',
    learningOutcome:
      'Students develop the independent practice skills that determine long-term musical growth — far more than any single lesson.',
    assessment: 'Participation: Did student practice with focus? Written work: Did student log progress in a practice journal?',
    clos: {
      awarenessOfFeeling:
        'When I set a goal and work toward it on my own, I feel my own progress in a way nothing else gives me.',
      awarenessOfTechnique:
        'I can set a practice goal, work toward it with focused attention, and reflect on what worked and what didn\'t.',
      awarenessOfContext:
        'When I run into a specific challenge, I apply a specific strategy — slow practice, looping, isolating problem spots — so my practice is effective, not just long.',
    },
    standards: ['Performing'],
    impactValues: ['Empowerment', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: personal practice environment', contextNote: 'Backing tracks, metronome, recording for self-review.' },
      { module: 'arcade', label: 'Atlas Arcade: skill-specific drills', contextNote: 'Gamified solo practice for technique work.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'co-write',
    title: 'Co-Write',
    phase: 'creativeProjects',
    purpose: 'Collaboration',
    initiationStyle: 'try-it-first',
    description:
      'Students work in pairs or small groups to write a piece together — practicing complementary roles. One writes melody, another writes chords; one writes lyrics, another writes a beat; etc. The pair coordinates and produces a shared song.',
    learningOutcome:
      'Students learn to write songs collaboratively — a core skill in modern songwriting and production.',
    assessment: 'Output and participation: Did the team produce a co-written piece?',
    clos: {
      awarenessOfFeeling:
        'When I co-write with someone whose strengths are different from mine, I feel like the song is bigger than either of us could have made alone.',
      awarenessOfTechnique:
        'I can coordinate my musical role with a partner\'s — complementing rather than duplicating their work, listening to where my contribution should fit.',
      awarenessOfContext:
        'Most modern songwriting is collaborative. Pop, hip hop, and country all rely heavily on co-writing teams. Learning to co-write is learning the actual job.',
    },
    standards: ['Creating', 'Connecting'],
    impactValues: ['Prosocial', 'Modern', 'Community-Responsive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: co-write project space', contextNote: 'Shared multitrack for the collaboration.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'meaningful-repertoire',
    title: 'Meaningful Repertoire Planning',
    phase: 'creativeProjects',
    purpose: 'Collaboration',
    initiationStyle: 'try-it-first',
    description:
      'Students identify music they actually listen to and enjoy — songs, film and video game music, current pop, regional traditions. Teacher uses those choices as the basis for individual and group activities and projects. Repertoire choice becomes an act of student agency.',
    learningOutcome:
      'Students see themselves reflected in the curriculum and develop a working relationship with music they actually care about.',
    assessment: 'Participation: Did student contribute meaningful musical examples to the curriculum?',
    clos: {
      awarenessOfFeeling:
        'When the music I love shows up in class, I feel respected — and I work harder because the work matters to me.',
      awarenessOfTechnique:
        'I can analyze what makes my favorite music work — the chord progressions, the rhythms, the production choices — and use those insights to learn or create.',
      awarenessOfContext:
        'Music isn\'t random or constantly-curated — I have the ability to be an informed listener, consumer, and creator. The more I understand, the more I can choose what I love and explore what\'s new.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: explore student-chosen music', contextNote: 'Use Globe to dig into the lineage of students\' favorite tracks.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'exploring',
    title: 'Exploring',
    phase: 'creativeProjects',
    purpose: 'Skill Building',
    initiationStyle: 'self-guided',
    description:
      'Students use instruments and Atlas tools independently — with minimal prompts or directives — to explore on their own creative imagination. Teacher may set a goal for sharing afterward, or not. The point is unstructured, curiosity-driven engagement.',
    learningOutcome:
      'Students discover that music is inherently interesting and that they can drive their own exploration without explicit instruction.',
    assessment: 'Participation: Did student immerse themselves in exploring over the allotted time?',
    clos: {
      awarenessOfFeeling:
        'When I get unstructured time to explore an instrument or Studio, I feel curious and free — not performing for anyone, just finding things out.',
      awarenessOfTechnique:
        'When I discover something I want to learn how to do, I can find or research a way to do it without explicit instruction from a teacher.',
      awarenessOfContext:
        'Music is inherently interesting. I don\'t need an external goal to enjoy exploring — and many of the best musical discoveries come from undirected play.',
    },
    standards: ['Creating', 'Performing', 'Connecting'],
    impactValues: ['Empowerment', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: open exploration', contextNote: 'No prescribed task — students sketch, layer, try things.' },
      { module: 'arcade', label: 'Atlas Arcade: free play', contextNote: 'Games as exploration, not assessment.' },
      { module: 'globe', label: 'Atlas Globe: free exploration', contextNote: 'Follow curiosity through Globe with no specific assignment.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'mini-compositions',
    title: 'Mini-Compositions',
    phase: 'creativeProjects',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students create small original projects — a 2-bar looping chord progression, a bass line, a melody, or a single verse or chorus. Low-stakes, high-frequency. Many small completions build the muscle of finishing.',
    learningOutcome:
      'Students learn that composition is accessible and that they can complete a small piece in a single sitting.',
    assessment: 'Output: Did student complete a small original work? Notation, audio, or written form.',
    clos: {
      awarenessOfFeeling:
        'When I complete even a 2-bar idea, I feel like a composer. The act of finishing something — anything — changes what I think I\'m capable of.',
      awarenessOfTechnique:
        'I can create a 1- or 2-bar rhythm and put chords, bass notes, or melody to it. I can use a lyric, melodic hook, or chord progression as the seed of an original song.',
      awarenessOfContext:
        'The creative process is accessible to me regardless of my instrumental skill set. Mini-compositions are how every composer starts.',
    },
    standards: ['Creating'],
    impactValues: ['Accessible', 'Empowerment', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: mini-composition templates', contextNote: 'Short-form templates for quick sketches.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'composing',
    title: 'Composing',
    phase: 'creativeProjects',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students create original music at an individually appropriate scale — from a complete instrumental piece, to a song, to a multi-section work. Open-ended; the goal is a complete, finished piece that the student can call their own.',
    learningOutcome:
      'Students experience the full arc of composing a complete piece — making decisions, revising, finishing, and signing their name.',
    assessment: 'Notation, recording, or written output: Did student complete a composition within the agreed parameters?',
    clos: {
      awarenessOfFeeling:
        'When I finish a complete piece I wrote, I feel proud in a way nothing else gives me. It\'s mine.',
      awarenessOfTechnique:
        'I can use whatever techniques I have at my disposal to create music. I can apply my creative imagination to vary and develop techniques and musical ideas.',
      awarenessOfContext:
        'In blues improvisation, I can use the same 2 or 3 notes in nearly infinite variations by applying my creativity to duration, loudness, articulation, order, and phrasing.',
    },
    standards: ['Creating', 'Performing'],
    impactValues: ['Empowerment', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: composition environment', contextNote: 'Full multitrack for composing longer works.' },
      { module: 'theory-lesson', label: 'Atlas Theory: composition techniques', contextNote: 'Reference material for developing musical ideas.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'research-project',
    title: 'Research Project',
    phase: 'creativeProjects',
    purpose: 'Critical Thinking',
    initiationStyle: 'self-guided',
    description:
      'Students dive into a music-related topic to gain and present information, draw informed conclusions, articulate educated opinions, and engage in intelligent discussion. Topics can range from a specific artist or style to a technology, an instrument, a movement, or an unresolved question in music history.',
    learningOutcome:
      'Students develop the discipline of research and critical thinking applied to music — and produce a substantial intellectual artifact.',
    assessment: 'Presentation and/or written work or video: Did student complete the research project per the assigned rubric?',
    clos: {
      awarenessOfFeeling:
        'When I research a music topic I\'m genuinely interested in, I feel more informed, intelligent, curious, inspired, and motivated to keep learning.',
      awarenessOfTechnique:
        'I can write a coherent article, essay, or presentation using appropriate jargon, grammar, and structure that presents and supports a compelling main idea.',
      awarenessOfContext:
        'Because I understand the historical origins of Black American music and the Afro-Caribbean diaspora, I can have a dynamic discussion about modern Latino Hip Hop artists, citing historical convergences of Latin and Black American music styles and artists.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: research source material', contextNote: 'Globe is the primary research environment — artists, styles, lineages, cultures.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: depth on specific styles', contextNote: 'For research projects focused on a particular genre.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'songwriting-composing',
    title: 'Songwriting / Composing (Full Work)',
    phase: 'creativeProjects',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students notate and/or record a full song or piece of music — a complete artifact with all sections (intro, verse, pre-chorus, chorus, bridge, breakdown, interlude, outro) in place. Longer-form than a mini-composition; the goal is a release-ready or performance-ready work.',
    learningOutcome:
      'Students complete a fully-realized musical work — and learn what it takes to finish at full scope.',
    assessment: 'Recording and notation: Did student complete a written chart and/or record a complete composition within the assigned parameters?',
    clos: {
      awarenessOfFeeling:
        'When I create a fully realized song, I feel competent, elated, proud, pleasantly surprised — like I just did something I wasn\'t sure I could do.',
      awarenessOfTechnique:
        'I can write a piece of music by defining my song form and crafting multiple sections — intro, verse, pre-chorus, chorus, bridge, breakdown, interlude, outro.',
      awarenessOfContext:
        'Instrumental compositions often use lettered or numbered section markers (A A B A), while songs are organized by Verse, Chorus, Bridge, etc. Each convention came from somewhere.',
    },
    standards: ['Creating', 'Producing', 'Presenting'],
    impactValues: ['Empowerment', 'Modern', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: full-song recording', contextNote: 'Complete multitrack with section markers.' },
      { module: 'theory-lesson', label: 'Atlas Theory: song form deep-dive', contextNote: 'Reference for building a full song architecture.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'producing',
    title: 'Producing',
    phase: 'creativeProjects',
    purpose: 'Production',
    initiationStyle: 'try-it-first',
    description:
      'Students use Atlas Studio to mix tracks — balancing volume, panning, EQ, and effects to shape the final sound. Can be applied to their own recordings, others\' work, or stems provided as practice material.',
    learningOutcome:
      'Students learn the craft of production — turning a collection of recorded parts into a finished, polished track.',
    assessment: 'Recording: Did student complete a production project per the assigned parameters?',
    clos: {
      awarenessOfFeeling:
        'When I produce music and make it sound better than the raw recording, I feel competent, elated, proud — like I gave the song what it needed.',
      awarenessOfTechnique:
        'I can change what is "up front" in the mix using volume and compression. I can use ambient effects like reverb and delay to give depth to vocals and instruments.',
      awarenessOfContext:
        'A good mix considers three dimensions: left-right panning, up-down EQ, and front-back volume and ambience.',
    },
    standards: ['Creating', 'Producing'],
    impactValues: ['Modern', 'Empowerment', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: mixing environment', contextNote: 'Studio\'s mixer for volume, panning, EQ, and effects.' },
      { module: 'genre-lesson', label: 'Atlas Genre Lessons: production conventions', contextNote: 'How different styles are produced.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'contribute-complementary-skills',
    title: 'Contribute Complementary Skills',
    phase: 'creativeProjects',
    purpose: 'Ambassador',
    initiationStyle: 'try-it-first',
    description:
      'Students contribute non-instrumental skills to a project — lyric writing, video production, graphic design, marketing, social media, event planning, photography. Recognizes that real music projects require many roles, not just performers.',
    learningOutcome:
      'Students see themselves as valuable contributors to musical projects even if performance isn\'t their strongest area.',
    assessment: 'Participation and product: Did student contribute specific skills, ideas, and deliverables to the group project?',
    clos: {
      awarenessOfFeeling:
        'I am valuable in a group project and have the ability to contribute meaningful skills to a musical project even if I\'m not the strongest musician.',
      awarenessOfTechnique:
        'I can contribute specific non-performance skills — writing, design, marketing, organization, video — that real music projects require.',
      awarenessOfContext:
        'Real musical projects in the music industry require dozens — sometimes hundreds — of complementary contributions to be recorded, produced, distributed, marketed, performed, funded, and organized.',
    },
    standards: ['Creating', 'Presenting', 'Connecting'],
    impactValues: ['Inclusive', 'Modern', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: project workspace with roles', contextNote: 'Studio supports non-performance contributions in a shared project.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'inspired-by-art',
    title: 'Inspired by Art',
    phase: 'creativeProjects',
    purpose: 'Ambassador',
    initiationStyle: 'try-it-first',
    description:
      'Students write lyrics inspired by visual artwork. Prompts: What is the story? Describe the sensory experience — what does it feel like, sound like, taste like? Visual prompts can be sourced from any art tradition.',
    learningOutcome:
      'Students cross-train between visual and lyrical art and discover that one medium can unlock another.',
    assessment: 'Output: Did student produce lyrics in response to the artwork?',
    clos: {
      awarenessOfFeeling:
        'When I write lyrics in response to a painting, I find words I wouldn\'t have found from looking at a blank page — the image is doing some of the work.',
      awarenessOfTechnique:
        'I can study a piece of visual art and translate what I see into lyrics that capture its mood, story, or sensory experience.',
      awarenessOfContext:
        'Cross-disciplinary creative response is a real artistic practice. Joni Mitchell painted what she heard; many songwriters draw directly from visual prompts.',
    },
    standards: ['Creating', 'Connecting'],
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: visual art collections', contextNote: 'Curated art for lyric prompts.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-writing',
    title: 'Theme Writing',
    phase: 'creativeProjects',
    purpose: 'Composition',
    initiationStyle: 'try-it-first',
    description:
      'Students pick one theme to write lyrics about: (1) what would you tell yourself in the past? (2) a letter to someone you can\'t talk to. (3) love or heartbreak. (4) success or failure. (5) life philosophy or a major life event. Sensory prompts also work: if [theme] were a smell, what would it smell like? A taste?',
    learningOutcome:
      'Students access the personal source material that great songwriting comes from — and learn to translate experience into lyric.',
    assessment: 'Output: Did student produce lyrics on the chosen theme?',
    clos: {
      awarenessOfFeeling:
        'When I write about something I actually care about, the lyric writes itself in a way it doesn\'t when I\'m trying to be clever.',
      awarenessOfTechnique:
        'I can take a personal theme and develop it into lyric content using imagery, specificity, sensory detail, and emotional honesty.',
      awarenessOfContext:
        'Most great songwriting comes from a specific, personal source — Taylor Swift\'s diary, Joni Mitchell\'s relationships, Kendrick\'s neighborhood. The personal is universal.',
    },
    standards: ['Creating', 'Connecting'],
    impactValues: ['Therapeutic', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: lyric writing canvas', contextNote: 'Studio supports lyric drafting alongside the musical sketch.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },


  /* ============================================================
     PHASE 4: PRESENT / PERFORM
     ============================================================ */

  {
    id: 'perform-for-audience',
    title: 'Perform for an Audience',
    phase: 'presentPerform',
    purpose: 'Public Performance',
    initiationStyle: 'learn-to-apply',
    description:
      'Students perform a complete piece for an audience beyond their classmates — a recital, a school showcase, an open mic, a parents\' night, a community event. Real audience, real stakes, real preparation.',
    learningOutcome:
      'Students experience the difference between practicing for themselves and playing for others — and the courage that grows from doing it.',
    assessment: 'Performance: Did student perform competently in front of an audience?',
    clos: {
      awarenessOfFeeling:
        'When I perform a piece I\'ve prepared for, I feel competent, elated, proud, pleasantly surprised — and aware that the audience wants me to succeed.',
      awarenessOfTechnique:
        'When I feel performance anxiety, I can use strategies — box breathing, stretching, drumming on my legs — to self-regulate. When I\'ve practiced enough, I can perform with confidence and courage.',
      awarenessOfContext:
        'When I perform, I am aware that the audience wants me to succeed. So I put my best effort and sincere emotion into the performance.',
    },
    standards: ['Performing', 'Presenting', 'Connecting'],
    impactValues: ['Empowerment', 'Prosocial', 'Community-Responsive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: recording the performance', contextNote: 'Capture the performance for later review.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'individual-performance',
    title: 'Individual Performance',
    phase: 'presentPerform',
    purpose: 'Share in Process',
    initiationStyle: 'learn-to-apply',
    description:
      'Students perform an exercise, excerpt, or complete piece by themselves for the class — approximating the experience of expertise. Lower-stakes than a public performance but still a real moment.',
    learningOutcome:
      'Students experience solo performance in a supportive setting — building the courage and habits that public performance later requires.',
    assessment: 'Performance: Did student participate in the directed performance?',
    clos: {
      awarenessOfFeeling:
        'When I have mastery over a technique, I feel confident that I can perform it. When I don\'t, I learn what to practice next.',
      awarenessOfTechnique:
        'I can prepare a piece or technique to a level of consistency and perform it as a solo for my classmates.',
      awarenessOfContext:
        'Performing for peers is the practice ground for performing for the world. Every musician started by playing for friends and family.',
    },
    standards: ['Performing', 'Presenting'],
    impactValues: ['Empowerment', 'Prosocial'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: recording solo performance', contextNote: 'Capture for self-review.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'listening-session',
    title: 'Listening Session',
    phase: 'presentPerform',
    purpose: 'Listening Session',
    initiationStyle: 'try-it-first',
    description:
      'Student producers share tracks they\'ve made — finished or in progress — and receive feedback from peers and teacher. A regular ritual normalizes the process of putting work in front of listeners and absorbing response.',
    learningOutcome:
      'Students learn to share work-in-progress and to give and receive useful feedback — the core practice of any creative discipline.',
    assessment: 'Participation: Did student share a track and engage with feedback?',
    clos: {
      awarenessOfFeeling:
        'When I share something unfinished and people respond with care, I feel braver about finishing it and braver about sharing the next one.',
      awarenessOfTechnique:
        'I can present a track I\'m working on, articulate what I\'m trying to do, and listen to feedback without becoming defensive.',
      awarenessOfContext:
        'Listening sessions are a real industry practice — labels host them, producers run them, songwriters use them. It\'s where music gets sharpened.',
    },
    standards: ['Presenting', 'Producing', 'Responding'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Modern'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: shared playback environment', contextNote: 'Play tracks for the class with good sound and timing markers.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'perform-as-ensemble',
    title: 'Perform as an Ensemble',
    phase: 'presentPerform',
    purpose: 'Public Performance',
    initiationStyle: 'learn-to-apply',
    description:
      'The class — or a subset — performs together as an ensemble for an audience. Could be the full class on a single piece, or small groups taking turns. Builds on group practice and arrives at public sharing.',
    learningOutcome:
      'Students experience ensemble performance — where individual contributions integrate into something larger.',
    assessment: 'Performance: Did student participate fully in the ensemble performance?',
    clos: {
      awarenessOfFeeling:
        'When I perform with an ensemble, I feel held by the group — like I don\'t have to carry the whole thing on my own.',
      awarenessOfTechnique:
        'I can perform my part in an ensemble — adjusting my dynamics, timing, and confidence based on what the group needs.',
      awarenessOfContext:
        'Ensemble performance is one of the oldest forms of music-making. From a string quartet to a hip hop crew, the group always sounds different from the parts.',
    },
    standards: ['Performing', 'Presenting'],
    impactValues: ['Prosocial', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: ensemble recording', contextNote: 'Capture the ensemble performance for archive.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'research-presentation',
    title: 'Research Presentation',
    phase: 'presentPerform',
    purpose: 'Share in Process',
    initiationStyle: 'learn-to-apply',
    description:
      'Student presents the results of a research project to the class — either as a talk, a video, a written report shared aloud, or a multimedia presentation. The audience asks questions; the student defends their conclusions.',
    learningOutcome:
      'Students learn to present and defend musical ideas — a foundational skill for any career in music, education, or related fields.',
    assessment: 'Presentation and/or written work: Did student present their research per the assigned rubric? Did they answer audience questions thoughtfully?',
    clos: {
      awarenessOfFeeling:
        'When I present research I\'m proud of, I feel like a real authority on something — even if I\'m only 14.',
      awarenessOfTechnique:
        'I can present musical ideas clearly using appropriate vocabulary, examples, and supporting evidence — and answer questions about my conclusions.',
      awarenessOfContext:
        'Music journalism, criticism, lecture-recital, and academic musicology are real career paths. Presentation is its own musical discipline.',
    },
    standards: ['Presenting', 'Connecting', 'Responding'],
    impactValues: ['Empowerment', 'Inclusive', 'Community-Responsive'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: presentation source material', contextNote: 'Reference Globe content during the presentation.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },


  /* ============================================================
     PHASE 5: RESPOND / REFLECT / RESET
     ============================================================ */

  {
    id: 'peer-and-teacher-feedback',
    title: 'Peer (and Teacher) Feedback',
    phase: 'respondReflectReset',
    purpose: 'Peer Feedback',
    initiationStyle: 'learn-to-apply',
    description:
      'Students have public and/or private means to offer feedback on each other\'s creative projects. Common protocols: "Two Stars and a Wish" (two things working, one thing to try), "Glow and Grow" (what shines, what could develop). Feedback is specific, generous, and actionable.',
    learningOutcome:
      'Students learn to give and receive constructive feedback — one of the most useful career-and-life skills music education can build.',
    assessment: 'Participation: Did student give thoughtful feedback to peers and engage with feedback received?',
    clos: {
      awarenessOfFeeling:
        'When a peer gives me specific, kind feedback, I feel seen — and the work gets better. When I give it well, I feel like I\'m part of building something with them.',
      awarenessOfTechnique:
        'I can give feedback that\'s specific (referencing actual moments in the work), generous (assuming the maker\'s good intentions), and actionable (something they can try).',
      awarenessOfContext:
        'Constructive feedback is the lifeblood of any creative discipline. Songwriters circle each other in rooms; producers send mixes to peers; bands argue their way to better takes.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: feedback comments on tracks', contextNote: 'When Atlas Studio supports timestamped comments, feedback can attach to specific moments.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'artist-spotlight-request',
    title: 'Artist Spotlight Request',
    phase: 'respondReflectReset',
    purpose: 'Planning',
    initiationStyle: 'try-it-first',
    description:
      'Students submit artist spotlight suggestions — paper, digital form, or shared list. Teacher uses student requests to plan upcoming Connect/Regulate openers. Student agency over what the class learns next.',
    learningOutcome:
      'Students see their voice directly shape the curriculum — and learn to advocate for the music that matters to them.',
    assessment: 'Participation: Did student submit at least one artist suggestion?',
    clos: {
      awarenessOfFeeling:
        'When my suggested artist shows up in class, I feel like my voice mattered — and I see my classmates respond to music I love.',
      awarenessOfTechnique:
        'I can articulate why an artist or piece deserves attention — what about their work I want others to notice.',
      awarenessOfContext:
        'Curriculum is a collaboration between teacher and student. The most engaged classrooms are ones where students help shape what gets studied.',
    },
    standards: ['Connecting', 'Responding'],
    impactValues: ['Community-Responsive', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Atlas Globe: artist request library', contextNote: 'Students can submit artist requests directly through Globe.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'self-reflection-planning',
    title: 'Self-Reflection and Planning',
    phase: 'respondReflectReset',
    purpose: 'Self-Reflection',
    initiationStyle: 'self-guided',
    description:
      'Students have public or private means to articulate self-reflection and plan next steps. Journaling, surveys, voice memos, or a shared class form. Prompts: What worked today? What do I want to try next? What\'s the next concrete step?',
    learningOutcome:
      'Students build the habit of reflecting on their own work and setting their own direction — the foundation of lifelong musicianship.',
    assessment: 'Participation: Did student complete a self-reflection entry?',
    clos: {
      awarenessOfFeeling:
        'When I take a few minutes to reflect honestly, I notice things about my work and my process that I would have missed otherwise.',
      awarenessOfTechnique:
        'I can articulate what worked, what didn\'t, and what I want to do next. I can name a concrete next step.',
      awarenessOfContext:
        'Every working musician has some form of reflective practice — journaling, voice memos, end-of-session debriefs. The habit is what compounds over time.',
    },
    standards: ['Responding', 'Connecting'],
    impactValues: ['Therapeutic', 'Empowerment', 'Accessible'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: practice journal alongside the session', contextNote: 'Reflection captured next to the work.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'reset-the-space',
    title: 'Reset the Space',
    phase: 'respondReflectReset',
    purpose: 'Reset',
    initiationStyle: 'learn-to-apply',
    description:
      'Students put away equipment, save projects, log out of shared hardware and software, reset chairs and tables. Done with intention — these are not menial tasks but the closing ritual that makes the next day possible.',
    learningOutcome:
      'Students develop care for shared space and equipment, and learn that closing well is part of doing the work.',
    assessment: 'Participation: Did student reset their station?',
    clos: {
      awarenessOfFeeling:
        'When I save my work, log out, and put equipment away, I feel like I closed the day properly — and I show up better tomorrow.',
      awarenessOfTechnique:
        'I can save my projects, log out of shared accounts, and put materials away in a way that makes them ready for the next user.',
      awarenessOfContext:
        'Taking care of shared space and equipment is responsible citizenship — and protects the work of every classmate and future user.',
    },
    standards: ['Connecting'],
    impactValues: ['Prosocial', 'Community-Responsive', 'Therapeutic'],
    atlasResources: [
      { module: 'studio', label: 'Atlas Studio: save and sign out', contextNote: 'End-of-class save routine in Studio.' },
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

];

export const RAW_ACTIVITIES = activities;
