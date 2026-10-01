/**
 * Style DNA for Hip Hop — L1 Trap, L2 Boom Bap, L3 Conscious.
 * Rewritten 2026-09-30 from the planning ledger (docs/genre-activities) to match
 * the authored flows (activityFlows/hipHop_v2.ts); it replaces the original
 * Boom Bap Keys / Trap & Soul / Producer outline.
 */

import type { StyleDnaLevel } from './types';

export const hipHopStyleDna: StyleDnaLevel[] = [
  {
    level: 1,
    subtitle: 'Trap',
    artists: [
      {
        name: 'Metro Boomin',
        description:
          'Dark minor loops, 808 sub-bass that slides, half-time snares and rolling hi-hats. "Mask Off" (Future), "Bad and Boujee" (Migos).',
        tags: [
          'hiphop:metro_boomin:dark_minor_loop',
          'hiphop',
          'hiphop:metro_boomin:808_slide',
          'hiphop',
          'hiphop:metro_boomin:half_time_feel',
          'hiphop',
        ],
      },
      {
        name: 'Southside (808 Mafia)',
        description:
          'Heavy 808s locked to the kick, sparse triad pads, hi-hat rolls in 32nds and triplets. Co-produced "Jumpman" (Drake & Future).',
        tags: [
          'hiphop:southside:kick_locked_808',
          'hiphop',
          'hiphop:southside:hihat_rolls',
          'hiphop',
          'hiphop:southside:sparse_pad',
          'hiphop',
        ],
      },
      {
        name: 'Lex Luger',
        description:
          'Big minor triads over booming 808s — the sound that took trap mainstream. "Hard in da Paint" (Waka Flocka Flame), "H•A•M."',
        tags: [
          'hiphop:lex_luger:minor_triad_stabs',
          'hiphop',
          'hiphop:lex_luger:booming_808',
          'hiphop',
        ],
      },
    ],
    vocabulary: [
      {
        category: 'Scales/Modes',
        description:
          'C minor pentatonic, then C Aeolian (natural minor). ♭6 → 5 is the dark move.',
      },
      {
        category: 'Chords',
        description:
          'Triads only: root position, then 1st inversions. Cm 1st inv ↔ Fm and Cm ↔ G 1st inv keep a common tone on top. Chords sit high (C5–C6).',
      },
      {
        category: 'Progressions',
        description:
          '1 min vamp; 1 min – 4 min; 1 min – 5 maj; two-chord inversion jams.',
      },
      {
        category: 'Techniques',
        description:
          'Whole notes, then 8th-note chunking (always staccato). Trap 2-bar comp: a whole note in bar 1, stabs on 1, "a" of 1, 3 and "a" of 3 in bar 2.',
      },
      {
        category: 'Bass',
        description:
          'Trap foundation: root on 1, the 5 on the "and" of 3. Expansion in bar 1 OR bar 2: 5 → ♭7, 5 → ♭3, or ♭6 → 5 (Aeolian). 808 sustain with slides.',
      },
      {
        category: 'Groove',
        description:
          'trap_a, trap_b — 808 kit, half-time at 72 BPM, 16th hats with rolls.',
      },
    ],
  },
  {
    level: 2,
    subtitle: 'Boom Bap',
    artists: [
      {
        name: 'DJ Premier',
        description:
          'Chopped samples, hard swung drums, scratched hooks — the New York sound. "Mass Appeal" (Gang Starr), "N.Y. State of Mind" (Nas).',
        tags: [
          'hiphop:dj_premier:chopped_sample',
          'hiphop',
          'hiphop:dj_premier:hard_drums',
          'hiphop',
        ],
      },
      {
        name: 'Pete Rock',
        description:
          'Jazz and soul loops with filtered bass and horn stabs. "They Reminisce Over You (T.R.O.Y.)."',
        tags: [
          'hiphop:pete_rock:jazz_soul_loop',
          'hiphop',
          'hiphop:pete_rock:horn_stab',
          'hiphop',
        ],
      },
      {
        name: 'Wu-Tang Clan',
        description:
          'RZA\'s gritty, cinematic loops — dusty soul samples, detuned piano, hard drums. "C.R.E.A.M.," "Protect Ya Neck."',
        tags: [
          'hiphop:wu_tang_clan:gritty_soul_loop',
          'hiphop',
          'hiphop:wu_tang_clan:detuned_piano',
          'hiphop',
        ],
      },
      {
        name: 'N.W.A',
        description:
          'West Coast pioneers: Dr. Dre and DJ Yella\'s funk-sampling drums under a voice that changed what hip hop could say. "Straight Outta Compton," "Express Yourself."',
        tags: [
          'hiphop:nwa:funk_sample_drums',
          'hiphop',
          'hiphop:nwa:west_coast',
          'hiphop',
        ],
      },
      {
        name: 'Jay-Z',
        description:
          'Effortless flow over soulful, sample-driven boom bap that became an empire. "Dead Presidents II," "Empire State of Mind."',
        tags: [
          'hiphop:jay_z:soul_sample_boom_bap',
          'hiphop',
          'hiphop:jay_z:effortless_flow',
          'hiphop',
        ],
      },
      {
        name: 'Dr. Dre',
        description:
          'Simple high piano and synth figures over a deep bass — a single repeated chord idea carries the track. "Still D.R.E.," "Nuthin\' but a \'G\' Thang."',
        tags: [
          'hiphop:dr_dre:high_piano_riff',
          'hiphop',
          'hiphop:dr_dre:deep_bass',
          'hiphop',
        ],
      },
      {
        name: 'Eminem',
        description:
          'Revolutionary and iconic: a white rapper from Detroit with dense, multisyllabic rhymes over Dr. Dre\'s sparse, heavy beats. "Lose Yourself," "The Real Slim Shady."',
        tags: [
          'hiphop:eminem:multisyllabic_rhyme',
          'hiphop',
          'hiphop:eminem:dre_production',
          'hiphop',
        ],
      },
      {
        name: 'Snoop Dogg',
        description:
          'The laid-back West Coast drawl over Dr. Dre\'s G-funk: slow funk grooves, whining synth leads, deep bass. "Gin and Juice," "Nuthin\' but a \'G\' Thang."',
        tags: [
          'hiphop:snoop_dogg:laid_back_flow',
          'hiphop',
          'hiphop:snoop_dogg:g_funk',
          'hiphop',
        ],
      },
    ],
    vocabulary: [
      {
        category: 'Scales/Modes',
        description:
          'A minor blues (the ♭5), then A Dorian (the bright 6, F♯).',
      },
      {
        category: 'Chords',
        description:
          'Triads and inversions reviewed, then sus4 and sus2 resolving: Am sus4 (D–E–A) → Am (C–E–A); Am sus2 → Am; Dm sus2 → Dm. Play-along chords in the C6–C8 range.',
      },
      {
        category: 'Progressions',
        description:
          'Em 1st inv → Dm 1st inv (parallel); Dm | Dm | Am sus4 | Am; Am sus2 Am | Am sus2 Am | Dm sus2 Dm | Dm sus2 Dm.',
      },
      {
        category: 'Techniques',
        description:
          '8th-note chunking, always staccato. Two chords a bar in the sus2 groove.',
      },
      {
        category: 'Bass',
        description:
          'Locked to the kick; roots move by step (E → D, never up a 7th). Root (quarter) – 5 (dotted 8th) – ♭7 (dotted 8th). Finger electric bass.',
      },
      {
        category: 'Groove',
        description: 'boombap_a, boombap_b — house kit, 87–90 BPM.',
      },
    ],
  },
  {
    level: 3,
    subtitle: 'Conscious',
    artists: [
      {
        name: 'A Tribe Called Quest',
        description:
          'Jazz samples, upright bass and laid-back drums under conversational rhymes. "Electric Relaxation," "Can I Kick It?"',
        tags: [
          'hiphop:tribe:jazz_sample',
          'hiphop',
          'hiphop:tribe:upright_bass',
          'hiphop',
        ],
      },
      {
        name: 'Common',
        description:
          'Warm Rhodes chords and soulful, swung beats — often J Dilla behind the boards. "The Light," "I Used to Love H.E.R."',
        tags: [
          'hiphop:common:rhodes_chords',
          'hiphop',
          'hiphop:common:dilla_swing',
          'hiphop',
        ],
      },
      {
        name: 'Mos Def',
        description:
          'Soulful, melodic and politically minded; live-band warmth. "Ms. Fat Booty," "Umi Says."',
        tags: ['hiphop:mos_def:soulful_melody', 'hiphop'],
      },
      {
        name: 'Queen Latifah',
        description:
          'Claimed the mic for women and for message, over jazzy, soulful boom bap. "Ladies First," "U.N.I.T.Y."',
        tags: [
          'hiphop:queen_latifah:message_mc',
          'hiphop',
          'hiphop:queen_latifah:jazzy_boom_bap',
          'hiphop',
        ],
      },
      {
        name: 'Lauryn Hill',
        description:
          'Singing and rapping over doo-wop and soul harmony with a live band. "Doo Wop (That Thing)," "Everything Is Everything."',
        tags: [
          'hiphop:lauryn_hill:soul_harmony',
          'hiphop',
          'hiphop:lauryn_hill:sung_hook',
          'hiphop',
        ],
      },
      {
        name: 'Tupac Shakur',
        description:
          'Raw emotion and message over piano-led and G-funk beats. "California Love," "Dear Mama," "Changes."',
        tags: [
          'hiphop:tupac:message_mc',
          'hiphop',
          'hiphop:tupac:piano_loop',
          'hiphop',
        ],
      },
      {
        name: 'Kendrick Lamar',
        description:
          'Jazz and funk musicians in the room — extended chords, live bass, shifting feels. "Alright," "King Kunta."',
        tags: [
          'hiphop:kendrick_lamar:jazz_harmony',
          'hiphop',
          'hiphop:kendrick_lamar:live_bass',
          'hiphop',
        ],
      },
    ],
    vocabulary: [
      {
        category: 'Scales/Modes',
        description:
          'E Phrygian (the ♭2), E Dorian (the 6), E harmonic minor (D♯ leading home).',
      },
      {
        category: 'Chords',
        description:
          'Chords turn jazzy: Em9 (LH E, RH G–B–D–F♯), A/B (LH B, RH A–C♯–E), D♯dim7, Em add2, Am7, B7♭9 (A–C–D♯–F♯).',
      },
      {
        category: 'Progressions',
        description:
          'Em → F (Phrygian); Em9 → A/B (Dorian); D♯dim7 → Em add2 (harmonic minor); Am7 → B7♭9 → Em9.',
      },
      {
        category: 'Techniques',
        description:
          'Held chords with swing (66%); ascending 8th-note arpeggios, twice a bar; staccato 8ths on Phrygian.',
      },
      {
        category: 'Bass',
        description:
          'Roots locked to the kick, moving by step: E → F, E → B, D♯ → E (up a half step), A → B → E. Upright and 808.',
      },
      {
        category: 'Groove',
        description:
          'boombap_a, boombap_b, laid_back — house and 808 kits, 77–84 BPM, swung where the progression calls for it.',
      },
    ],
  },
];
