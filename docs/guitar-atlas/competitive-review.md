# Music Atlas Guitar: Competitive Synthesis

## 1. Landscape in brief

- **The two camps are converging.** Listening tutors (Yousician, Simply Guitar, Rocksmith+, Gibson App, Fender Play Feedback) are adding real tab and rhythm. Tab players (Songsterr, Soundslice, Guitar Pro, Ultimate Guitar) mostly don't listen. UG is the exception: it added mic scoring after each take ([UG Practice Mode](https://help.ultimate-guitar.com/en/articles/14588372-what-is-ultimate-guitar-practice-subscription)). No product pairs book-quality tab and notation with listening you can rely on. That gap is where Music Atlas fits.
- **The practice toolkit is table stakes.** Every serious product has an ungraded Practice mode (tempo %, loop, count-in, wait-for-me, mute backing, "play for me") separate from a graded Play mode, a synced fretboard showing the current and next notes, and stars per section. See [Yousician](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar), [Rocksmith+ Riff Repeater](https://www.ubisoft.com/en-us/help/article/000097812) and [Soundslice](https://www.soundslice.com/help/en/player/advanced/21/visual-fretboard/). None of this sets anyone apart.
- **Feedback is moving from live verdicts to reports after the take.** These break the score into pitch and rhythm and put markers you can tap on the music ([Fender Practice Session](https://lausd-instructor.fender.com/hc/en-us/articles/48066242196493-Practice-Session), [PracticeFirst](https://www.musicfirst.com/software/practicefirst)). Motor-learning research favours this over constant live feedback ([Wulf & Mornell 2008](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf-Mornell-2008.pdf)).
- **Detection is the category's weakest link, and nobody has solved it.**

  - Low E and A strings go undetected; Apple documents this for GarageBand ([Apple](https://support.apple.com/en-nz/101706)).
  - Noise counts as playing: Simply Guitar scored a cough as "a perfect Fmaj7" ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
  - A sustained chord gets counted as several strums.
  - Apps hear their own backing track.

  Degrading gracefully when detection is unsure would itself set us apart.

- **Color is used everywhere, but it means something different in each product:**

  - finger in Yousician;
  - string in Rocksmith;
  - chord in JustinGuitar;
  - pitch in Soundslice's Boomwhackers mode;
  - note name in Fret Zealot, which users criticise because the colors don't follow the key.

  No one uses color for the key and shape for the chord, so that consistent meaning is ours to own. It has to survive colorblind users, though. [WCAG 1.4.1](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) forbids color as the only carrier of meaning, and the [CUD colorblind-safe palette](https://jfly.uni-koeln.de/color/) has 8 colors against our 12 keys.

- **Theory lives in reference tools, not in curricula.** Scale-degree labels ([Soundslice](https://www.soundslice.com/help/en/player/advanced/226/showing-pitch-names/)), a Roman-numeral progression matrix across all 12 keys ([Oolimo](https://www.oolimo.com/en/chord-progressions/matrix)) and transposing drills ([Solo](https://www.solotrainer.app/)) all exist. Meanwhile the song-first leaders are called "weaker at explaining why" ([Guitar Start Guide on Rocksmith+](https://www.guitarstartguide.com/rocksmith-review/)). Nobody offers a book-backed, 12-key curriculum built on a number system. Nobody offers a progression map that redraws for piano or guitar either; Chordify's instrument switch is the closest thing ([EAS](https://www.educationalappstore.com/app/chordify-chords-for-any-song)).
- **Classrooms are underserved.**

  - [Yousician for Teachers has ended](https://yousician.com/teachers).
  - Fender Play's teachers check progress by asking students to "share their My Path page" ([doc](https://lausd-instructor.fender.com/hc/en-us/articles/360043977712-How-to-Support-Teaching-Differentiation)), and LMS integration is only a stated goal.
  - Soundslice, Moosiko and PracticeFirst handle assignments, recordings and rubrics, but none of them listen live in the room.

  Classroom v2's live projector with per-student detection has no direct competitor.

- **Left-handed and neurodiverse support is patchy, so the bar is low.** Simply and Fender have no left-handed mode, and UG's was mobile-only. Rocksmith+ has the one published visual-load and color spec worth beating ([Ubisoft](https://news.ubisoft.com/en-us/article/5XfINjoRmVJgBKR8fGt4EM)).

## 2. Recommendations by plan component

Tags: **MUST** = v1. **SHOULD** = v1 if cheap. **LATER** = after v1.

### (a) TAB view (VexFlow)

- **MUST: Tab with rhythm (stemmed tab).** Draw stems, beams, rests and the time signature on the fret numbers.
  - Drawn from [Songsterr](https://www.songsterr.com/howtoreadtab) and [Soundslice](https://www.soundslice.com/blog/25/stemmed-tablature/). Counter-example: Simply Guitar's tab has "no grid… no time signature… how long a note is meant to be sustained for isn't shown" ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
  - **Plan:** turn on stems for VexFlow `TabNote` (`draw_stem`) so the Melody lessons' whole, half, quarter and eighth notes can be read from the tab alone.
- **MUST: String names at the start of every system** (`e B G D A E`), thin string on top.
  - Drawn from [Guitar Pro](https://www.guitar-pro.com/blog/p/17044-tuto-10-tips-to-give-a-professional-look-to-your-scores-in-guitar-pro) (tuning printed before the tab) and [UG](https://help.ultimate-guitar.com/en/articles/6748975-website-how-to-read-official-and-pro-tabs). Rocksmith players ask for this directly: "tell me its an e or an A" ([Steam](https://steamcommunity.com/app/221680/discussions/0/540744935638085696/)).
  - **Plan:** a cheap `TabStave` label that helps beginners match lines to strings.
- **MUST: A playhead that highlights the current note, with a choice of paged or continuous layout.** Paged means no scrolling. Let users hide the highlight so they can read ahead, and offer a softer playhead style.
  - Drawn from Soundslice's [playhead style](https://www.soundslice.com/help/en/player/advanced/292/playhead-style-color/), [scroll modes](https://www.soundslice.com/help/en/player/advanced/116/playhead-scrolling-options/) and [paged layout](https://www.soundslice.com/blog/241/introducing-our-new-paged-layout/), and from Fender's [red cursor](https://fenderplay.zendesk.com/hc/en-us/articles/360034336451-What-is-Practice-Mode).
  - **Plan:** a cursor overlay on the VexFlow SVG. Paged is the default for the projector and the low-stimulation preset, and scrolling must always be steady.
- **SHOULD: Click-to-seek plus keyboard control.** Space to play/pause, ←/→ by note, Ctrl+←/→ by bar, Enter to restart.
  - Drawn from [Pickup Music](https://help.pickupmusic.com/en/articles/10591947-how-to-use-the-interactive-notation) and [Soundslice](https://www.soundslice.com/help/en/player/tips/1/keyboard-shortcuts/).
  - **Plan:** needed for keyboard-only use and for a teacher driving the projector.
- **SHOULD: A label toggle for tab notes:** fret (default), finger, note name or scale degree.
  - Drawn from [Soundslice pitch names](https://www.soundslice.com/help/en/player/advanced/226/showing-pitch-names/) and [Oolimo](https://www.oolimo.com/en/chord-types/barre-chords).
  - **Plan:** compute degree labels from the key center to link Melody tab to the Music Map numbers. Show finger numbers as text, never as color.
- **SHOULD: A toggle for each display element plus a one-tap low-stimulation preset.**
  - Drawn from [Rocksmith+](https://gamecritics.com/brad-gallaway/rocksmith-accessibility-spotlight/), where fingering, fret numbers, chord names and the next-chord countdown can each be switched off, and from [Soundslice](https://www.soundslice.com/help/en/player/advanced/133/track-appearance/), which only shows toggles for what's actually on the page.
  - **Plan:** part of the neurodiverse-friendly design.
- **LATER: Standard notation shown with tab.**
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar), which has 5 notation modes.
  - **Plan:** pair a VexFlow `Stave` with the `TabStave` and reuse the piano notation code.

### (b) Chord box

- **MUST: Follow book conventions.**
  - Strings 6→1 from left to right, with a thick nut.
  - Finger number inside each dot, X/O above the nut.
  - A starting-fret label when the shape sits above first position.
  - A root marker.
  - Drawn from [Fender chord charts](https://www.fender.com/articles/chords/read-guitar-chord-charts) and the [Uberchord legend](https://www.uberchord.com/get-started/), which puts a small "R" by the root string.
  - **Plan:** one component draws the book art and the live states. The root marker is the chord's "1".
- **MUST: The key color tints only the box frame or header, never the finger dots.**
  - Drawn from a Yousician user who was confused because the chord blocks "use the same palette as the lead line finger coding" ([Guitar Chalk comment](https://www.guitarchalk.com/yousician-review/)).
  - **Plan:** keeps "Keys are colors" to a single meaning.
- **MUST: A "Hear it" button that plays the exact voicing, strummed and arpeggiated, before the learner tries it.**
  - Drawn from [Yousician Play for me](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar) and the [Rocksmith+ chord preview](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/6qfPe1LGEymsFyO5KbiYRJ/how-to-read-and-practice-guitar-chord-charts). Hearing a model before trying helps learning without creating dependence ([Wulf & Mornell](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf-Mornell-2008.pdf)).
  - **Plan:** a synth driven by the box's fret data.
- **SHOULD: A label toggle for the dots:** finger, note name, or chord degree (1-3-5-7).
  - Drawn from [Oolimo](https://www.oolimo.com/en/guitar-chords/analyze).
  - **Plan:** connects "chords are shapes" to how a chord like `1 maj7` is spelled. The same data produces the text alternative.
- **SHOULD: After a miss, overlay which chord tones were heard, which were missing and which were extra.**
  - Drawn from Yousician's [red strings](https://support.yousician.com/hc/en-us/articles/202893201-Chords-are-not-recognized), the [Chordify trainer](http://web.archive.org/web/20260926054128/https://support.chordify.net/hc/en-us/articles/11755805765661-How-to-use-the-Toolkit-Premium-Plus-subscription-required) (wrong string, wrong fret, string not plucked cleanly) and [Guitar Wiz](https://apps.apple.com/in/app/guitar-wiz/id6740015002) (each fret turns green when heard).
  - **Plan:** in strum mode the chroma detector sees pitch classes, not strings. If a doubled note drops out (for example the high e in an E chord), it can't tell. So in strum mode, give feedback about chord tones ("missing the 3, G#"). Save per-string marks for arpeggiate mode (pitch tracker) and MIDI guitar.
- **SHOULD: Mirror the box when the global left-handed setting is on.**
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/202773522-Left-handed-option), where chord charts flip.
  - **Plan:** the same data with a mirrored render.
- **LATER: Show optional tones as small hollow dots, and offer alternative voicings.**
  - Drawn from [Oolimo](https://www.oolimo.com/en/chord-progressions/matrix) and [Uberchord](https://www.uberchord.com/get-started/).
  - **Plan:** useful for 7th-chord voicings where a tone can be left out.

### (c) Fretboard

- **MUST: Layered highlights.**
  - Context: the lesson's position, muted.
  - Now: the target note, strong.
  - Next: a faint look-ahead.
  - Played notes use a different mark (a ring rather than a fill).
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/player/advanced/21/visual-fretboard/) (the bar's notes in grey, the sounding note in orange) and [UG](https://help.ultimate-guitar.com/en/articles/6748975-website-how-to-read-official-and-pro-tabs) (current notes yellow, next notes grey).
  - **Plan:** extends our planned target and played highlights. Colorblind learners can still tell target from played.
- **MUST: A position overlay for each key.** Show the book's major-scale and pentatonic positions, mark the root with a distinct shape, and highlight the current chord shape inside that position with its root in the same place.
  - Drawn from [EveryGuitarChord](https://everyguitarchord.com/caged-system-guitar-fretboard-visualization/), [Guitar Fretboard: Scales](https://apps.apple.com/us/app/guitar-fretboard-scales/id1623791852) and [muted.io](https://muted.io/guitar-scales/).
  - **Plan:** shows Book One's pairing of scale and chords in each key.
- **MUST: Stable geometry.** A fixed fret window for each lesson, no auto-zoom, readable at phone width, and a full-screen option.
  - Counter-examples: Guitar Pro mobile's fretboard is "way TOO SMALL" ([review](https://apps.apple.com/gb/app/guitar-pro/id400666114?see-all=reviews&platform=iphone)), the [Guitar Blast](https://apps.apple.com/us/app/guitar-blast-learn-fretboard/id1483606692) board grows between levels, and Rocksmith's zooming and flashing lights bother players ([CustomsForge](https://customsforge.com/topic/67566-struggling-to-get-used-to-rocksmith-tabs/)).
  - **Plan:** size the fretboard to the position (about 5–6 frets), not the whole neck.
- **SHOULD: Color dots by scale degree relative to the key, not by note name,** with a label toggle for note, degree or finger.
  - Drawn from [FretBud](https://apps.apple.com/us/app/fretbud-chord-scales-auv3/id1234224249). Counter-example: Fret Zealot colors by note name, which forces users to recolor on every key change ([review](https://apps.apple.com/us/app/fret-zealot-learn-real-guitar/id1304907297)).
  - **Plan:** degrees are the Hybrid Number System, shown on the neck.
- **SHOULD: A "training wheels" option that hides the target dots after a set number of clean passes.**
  - Cues on the fretboard cut early wrong notes ([Keebler 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4034341/)). Live visuals can also distract, and musicians in one study wanted them faded over time ([Heyen et al. 2026](https://arxiv.org/html/2601.16708v1)).
  - **Plan:** avoids dependence on the display.
- **LATER: A per-fret accuracy heat map.**
  - Drawn from [Fretonomy](https://apps.apple.com/us/app/fretonomy-learn-fretboard/id1279576225).
  - **Plan:** built from pitch-tracker results across keys.

### (d) Input and chord-detection feedback

- **MUST: Capture raw audio.** Call `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` set to false. Browsers turn these on by default, and they distort both chroma and pitch.
  - Drawn from Yousician, which tells users to disable OS echo cancellation and noise reduction ([mic guide](https://support.yousician.com/hc/en-us/articles/360000488098-How-to-check-microphone-set-up-iOS-Android-PC-Mac)).
  - **Plan:** a one-line capture change that both detectors benefit from.
- **MUST: Score chords as events that start with a strum.** Score a strum when an onset fires, then track how long it rings for the duration score. A chord left ringing is one event.
  - Counter-example: Simply Guitar "registers it as multiple strums", so it can't judge strumming at all ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
  - **Plan:** the chroma detector reports a state, not events. Whole- and half-note strum lessons need onset detection plus sustain tracking.
- **MUST: Reject input that isn't music.** Use a noise gate calibrated to the room, and require a confidence threshold on the chroma before accepting a chord.
  - Counter-example: a cough scored as Fmaj7 and a pick scrape as E minor ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)). Rocksmith+ does this with [noise-reduction calibration](https://www.ubisoft.com/en-us/help/article/000103002).
  - **Plan:** the detector should output a confidence value.
- **MUST: Three results, not two:** hit, miss, and "couldn't hear clearly". The third carries no penalty and comes with a setup tip.
  - Low E and A on an acoustic through a laptop or phone mic are the known blind spot ([Apple](https://support.apple.com/en-nz/101706), [Simply reviews](https://apps.apple.com/us/app/simply-guitar-learn-guitar/id1476695335?see-all=reviews)).
  - **Plan:** before launch, benchmark the chroma detector on chords that use the low strings (E and A shapes) and on single low-string notes.
- **MUST: Detection alone never blocks progress.** Offer "I played it" and "count it myself" overrides, and log them.
  - JustinGuitar learners switch detection off ([community](https://community.justinguitar.com/t/chord-detection-issues/397102)); one was "literally crying in frustration" ([community](https://community.justinguitar.com/t/wont-detect-my-sounds/379569)).
  - **Plan:** progress gates accept an override.
- **MUST: Never score our own audio.** Prompt for headphones when backing plays, lower the backing during detection windows, and offer "Mute backing".
  - Counter-examples: Yousician "has trouble distinguishing me from its own background track" ([reviews](https://justuseapp.com/en/app/959883039/yousician-learn-play-guitar/reviews)), and Simply rewrites its tabs so the app doesn't hear itself ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
  - **Plan:** essential for Play-Along and for projector speakers.
- **SHOULD: Use strum, pick out, strum as the recovery loop.** After a failed strum, offer to pick the chord string by string, highlighting the target string and advancing as each note is heard.
  - Drawn from [JustinGuitar Chord Perfect](https://www.justinguitar.com/guitar-lessons/the-d-chord-bc-111). Yousician and Simply give the same advice.
  - **Plan:** reuses our Arpeggiate step and the pitch tracker, which is where per-string feedback is actually reliable.
- **SHOULD: Flag extra notes (X strings or tones outside the chord) with their own marker instead of failing the chord.**
  - Counter-examples: Yousician "doesn't notice when you play extra strings" ([BGHQ](https://beginnerguitarhq.com/yousician-guitar-review/)), and Rocksmith 2014 could be beaten by double-strumming ([Steam](https://steamcommunity.com/app/221680/discussions/0/622954302089475154)).
  - **Plan:** check the chroma energy in pitch classes outside the chord.
- **SHOULD: Chord zones in Play-Along.** A chord counts if it is heard correctly once within its zone, but misses are still shown.
  - Drawn from the [Rocksmith+ dev diary](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/49EG2FpjSvQSH2CXb0ySk3/rocksmith-dev-diary-march-2022-chord-charts-archi).
  - **Plan:** a fair tolerance for Music Maps in Play-Along.
- **SHOULD: Present the audio interface and MIDI guitar as the high-accuracy paths, and say so plainly in setup.**
  - At the Rocksmith+ launch the cable was "a necessity… not made immediately clear" ([guitar.com](https://guitar.com/reviews/accessories/ubisoft-rocksmith-review/)). Compare [Yousician's setup page](https://support.yousician.com/hc/en-us/articles/201723651-Choosing-your-setup-for-guitar).
  - **Plan:** when a MIDI guitar sends a channel per string, we get exact per-string feedback without guessing.

### (e) Scoring and the in-time / out-of-time modes

- **MUST: Two named modes, not an on/off toggle:** "Wait for me" (out of time) and "Keep time" (in time, with metronome).
  - Drawn from [Gibson Stop & Go](https://www.gibson.app/faq) and [Rocksmith+ Note by Note](https://www.ubisoft.com/en-us/help/article/000097812). Counter-example: Yousician's own help doc still describes its Wait To Play toggle backwards ([doc](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar)).
  - **Plan:** these are our two planned modes.
- **MUST: What each mode scores.** "Wait for me" scores pitch, plus how long the note rings in sustain lessons. "Keep time" scores pitch, timing and duration.
  - Drawn from Yousician's split between Practice and Play.
  - **Plan:** maps directly onto our three scoring dimensions.
- **MUST: Timing with a tolerance band.** A note inside the tolerance is simply "on time", with no number. Outside it, show "early" or "late". Widen the tolerance at slow tempos and in early keys.
  - Drawn from [Yousician's timing grades](https://beginnerguitarhq.com/yousician-guitar-review/) and [Chiviacowsky & Wulf](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Chiviacowsky_Wulf_good_FB_2007.pdf) on bandwidth feedback.
  - **Plan:** the design for the timing score.
- **MUST: A report after each take.**
  - An overall score plus pitch, timing and duration sub-scores.
  - Mistakes marked on the tab or Map; tapping a marker loops that bar.
  - The detail is shown even on low scores.
  - Drawn from [Fender Practice Session](https://lausd-instructor.fender.com/hc/en-us/articles/48066242196493-Practice-Session), [UG's "See Mistakes"](https://help.ultimate-guitar.com/en/articles/14588372-what-is-ultimate-guitar-practice-subscription) and [PracticeFirst](https://www.musicfirst.com/software/practicefirst). Counter-example: Fender's 2024 doc showed only the total score at 60 or below ([doc](https://fenderplay.zendesk.com/hc/en-us/articles/4410149175693-What-is-Feedback-Mode)).
  - **Plan:** the results screen.
- **MUST: Light live feedback by default,** meaning only hit or miss on the current note. The full detail comes after the take, and detailed live feedback is opt-in.
  - Constant live feedback raises performance in the session but hurts retention ([Wulf & Mornell](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf-Mornell-2008.pdf)). Live visuals "distract from playing" ([Heyen & Sedlmair](https://arxiv.org/html/2603.23639)).
  - **Plan:** the default for "Keep time", and calmer for neurodiverse learners.
- **MUST: A pass bar below 100%, stated up front** (for example 80% at the target tempo). Moving on and coming back later is the norm.
  - Drawn from [Rocksmith+](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/7ncvKJE9PCWmNWNrqmU5WJ/rocksmith-dev-diary-late-may-2022-lessons) (80% accuracy at 100% speed) and [Yousician](https://support.yousician.com/hc/en-us/articles/206912609-The-best-way-to-practice-guitar) (aim for silver, return for gold).
  - **Plan:** the completion rule for each lesson.
- **SHOULD: End every report with one concrete next step,** such as "Loop bars 3–4 at 70%".
  - In one study of expert lessons, only 16% of teacher feedback pointed forward like this ([Frontiers 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1705295/full)). Gibson's AI feedback does it ([Gibson](https://www.gibson.app/)).
  - **Plan:** one button that sets up that loop.
- **SHOULD: Ask "How did that go?" (1–3) before revealing the score.** Keep the best result for each section, and keep skill scores that only go up.
  - Drawn from [Wulf & Mornell](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf-Mornell-2008.pdf) (self-estimation helps learning), [Yousician "Your best"](https://support.yousician.com/hc/en-us/articles/208014795-Song-scoring-and-leaderboards) and [Gibson](https://www.gibson.app/faq).
  - **Plan:** a cheap motivational layer.
- **LATER: Automatic tempo adjustment and adaptive note density.**
  - Drawn from Yousician's [auto-adjust speed](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar) (25–125%) and Rocksmith+ [Adaptive Difficulty](https://www.ubisoft.com/en-us/help/article/000097526).

### (f) Practice tools

- **MUST: Tempo, metronome and count-in controls.**
  - Tempo in % and BPM, with ±1 and ±5 steps.
  - Metronome on every beat or downbeats only, with a volume control.
  - Count-in of 1–2 bars, either at the start or before each loop.
  - Drawn from [Fender](https://fenderplay.zendesk.com/hc/en-us/articles/4410149175693-What-is-Feedback-Mode), [Soundslice](https://www.soundslice.com/help/en/player/basic/8/metronome-and-count-in/) and [Yousician's loop lead-in](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar).
  - **Plan:** shared transport with piano.
- **MUST: Drag across bars to loop, snapping to barlines,** with a "pad by one bar" option.
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/player/basic/4/looping/). Experienced Rocksmith players loop the neighbouring sections too ([Steam](https://steamcommunity.com/app/221680/discussions/0/558751660798152945)).
  - **Plan:** works on both tab and Maps.
- **MUST: Mute the backing, isolate the part, and "Play for me".**
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar) and [Pickup's "No guitar"](https://help.pickupmusic.com/en/articles/11180476-understanding-the-no-guitar-no-bass-and-no-piano-options) mix.
  - **Plan:** also reduces detection errors.
- **SHOULD: A speed-trainer ladder** with a start %, a step size and a number of clean passes per step. Show the current step and its rule on screen, e.g. "80% → 90% after 2 clean passes".
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/player/basic/286/speed-training/). Counter-example: a Rocksmith 2014 player thought auto-difficulty was broken because its rules were never explained ([Steam](https://steamcommunity.com/app/221680/discussions/0/558751660798152945)).
  - **Plan:** builds on "Keep time".
- **SHOULD: Focus mode,** which hides the bars outside the loop.
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/player/basic/277/focus-mode/).
  - **Plan:** less visual load.
- **SHOULD: One-Minute Changes on chord pairs from the current key,** counted automatically by detection, with a manual fallback and saved history.
  - Drawn from [JustinGuitar OMC](https://www.justinguitar.com/guitar-lessons/stage-1-one-minute-changes-bc-115) and [AI Chord Practice](https://aiguitartuneronline.com/chords/practice/), where "landing on the wrong third doesn't count". Counter-example: Fender's Chord Challenge is self-reported and not saved ([doc](https://fenderplay.zendesk.com/hc/en-us/articles/360051459851-What-is-the-Chord-Challenge)).
  - **Plan:** define the pairs by number (1→4, 1→5, 2min7→5 7) so the drill carries over to all 12 keys.
- **LATER: A timed daily-routine builder.**
  - Drawn from [JustinGuitar](https://www.justinguitar.com/guitar-lessons/module-1-practice-routine-b1-116) and [Musora](https://www.musora.com/method).

### (g) Onboarding

- **MUST: An input picker with setup advice for each path.**
  - Mic: acoustic guitar 30–60 cm from the device ([Rocksmith+](https://www.ubisoft.com/en-us/help/article/000103842)); device propped up and out of its case ([Simply](https://piano-help.hellosimply.com/en/articles/5834436-3-essential-tips-before-you-start)); electric through a clean amp at "about speaking level".
  - Audio interface: choose the device and channel.
  - MIDI guitar.
  - Headphones whenever backing plays ([Yousician](https://support.yousician.com/hc/en-us/articles/201723651-Choosing-your-setup-for-guitar)).
  - **Plan:** the first-run wizard.
- **MUST: A "Turn microphone on" screen before the browser's permission prompt,** plus a recovery page if access is denied (including Chromebook and iPad).
  - Drawn from the [Fender tuner](https://fenderplay.zendesk.com/hc/en-us/articles/19817480648717-Fender-Play-Tuner) and [Fender's mic guide](https://lausd-instructor.fender.com/hc/en-us/articles/4423660270349-Enabling-the-Microphone-for-Practice-Session).
  - **Plan:** a web-specific necessity.
- **MUST: A live input meter, then a check on the two outer strings** ("play low E, then high e"). It must pass before lessons start.
  - Drawn from Yousician's [input activity dots](https://support.yousician.com/hc/en-us/articles/203751452-Game-tab).
  - **Plan:** catches the low-string blind spot at setup instead of in the middle of a lesson.
- **MUST: Tuner first.** It detects the string automatically, can play a reference tone, and says in words which way to turn the peg.
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/201542312-Tuning-your-guitar) and [GuitarTuna](https://guitartuna.com/online-guitar-tuner). Counter-example: tuners that can't hear D, A or low E ([Fretello](https://mwm.ai/apps/fretello-guitar-lessons/1107957482), [Simply](https://apps.apple.com/us/app/simply-guitar-learn-guitar/id1476695335?see-all=reviews)).
  - **Plan:** runs on our pitch tracker and is the learner's first test of whether the app can hear them.
- **MUST: Latency calibration** (play along to clicks), plus a manual ms slider with a plain-language rule. Rocksmith+ uses: "notes after the audio → set above 0 ms". Detect Bluetooth output and warn, or turn off in-time scoring.
  - Drawn from [Rocksmith+](https://www.ubisoft.com/en-us/help/article/000097535) and [Yousician on Bluetooth](https://support.yousician.com/hc/en-us/articles/202893381-Can-I-use-Bluetooth-headphones).
  - **Plan:** store the offset per device and output. "Keep time" depends on it.
- **MUST: Calibrate the noise floor during onboarding and again whenever the input changes,** with a "Recalibrate" button.
  - Drawn from [Rocksmith+](https://www.ubisoft.com/en-us/help/article/000103002).
  - **Plan:** feeds the noise gate in (d).
- **SHOULD: An immediate first win.** After tuning the low E, the learner plays it straight away.
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/204738362-Get-started-with-Yousician-guitar).
  - **Plan:** for example, the root of the first key over a backing track.
- **SHOULD: An ordered troubleshooting list** attached to every "couldn't hear" result: tune, then headphones or lower volume, effects off, permission, device and channel, recalibrate.
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/46277332028817-Guitar-sound-recognition-issues).
  - **Plan:** linked from the third detection result in (d).

### (h) Rhythm and strumming display for Music Maps

- **MUST: Chords and strums on one timeline.** Hybrid Number System chord symbols and strum marks share the same 16th-note grid, with bar and beat lines. Marks: ↓ ↑, an empty slot for a rest, x for a muted strum, > for an accent.
  - Drawn from [UG strumming patterns](https://help.ultimate-guitar.com/en/articles/6735563-website-how-to-read-strumming-patterns) and [fachords](https://www.fachords.com/guitar-strumming-patterns/). Counter-example: JustinGuitar shows chords and the strumming pattern separately, and learners get stuck on changes in the middle of a bar ([community](https://community.justinguitar.com/t/help-2-chords-in-a-bar-strumming-old-faithful-alone-or-with-the-songs-app-moderator-combined-topic/36367), [Musopia](https://musopia.zendesk.com/hc/en-us/articles/4413914904722-How-to-play-chords-and-apply-strumming-patterns-in-the-song-sessions)).
  - **Plan:** this is the Music Map format.
- **MUST: Show duration as length.** A whole-note strum is a bar-long block and a half note is half a bar. The block fills while the chord rings, and the sustain is scored.
  - Drawn from Yousician's [chord blocks](https://support.yousician.com/hc/en-us/articles/206932099-How-to-read-guitar-tablature) and [Figurenotes](https://figurenotes.org/what-is-figurenotes/): "the note is as long as it looks".
  - **Plan:** the whole-, half-, quarter- and eighth-note strum lessons.
- **MUST (scope): Strum direction is shown as guidance only.** Grade the onset timing and the duration.
  - This is our inference: none of the products reviewed claims to grade strum direction.
  - **Plan:** keeps the scoring claims honest.
- **MUST: A toggle for count labels ("1 e + a") under the grid.**
  - Drawn from [Soundslice rhythm counts](https://www.soundslice.com/help/en/player/advanced/325/showing-rhythm-counts/).
  - **Plan:** labels the 16th grid.
- **SHOULD: A pendulum or ghost-strum cue** that keeps the hand moving down and up through rests.
  - Drawn from [JustinGuitar](https://www.justinguitar.com/guitar-lessons/the-strumming-pattern-b1-404) ("just like a pendulum") and [fachords](https://www.fachords.com/guitar-strumming-patterns/).
  - **Plan:** an animation layer on the grid.
- **SHOULD: A preview of the next chord (small box plus countdown), and a button that plays the strum pattern.**
  - Drawn from [Rocksmith+](https://gamecritics.com/brad-gallaway/rocksmith-accessibility-spotlight/), the [JustinGuitar app](https://apps.apple.com/us/app/justin-guitar-lessons-songs/id1176125504) and [UG](https://help.ultimate-guitar.com/en/articles/6735563-website-how-to-read-strumming-patterns).
  - **Plan:** reuses the chord box component.
- **SHOULD: "Play this Map in another key".**
  - Drawn from the [Oolimo matrix](https://www.oolimo.com/en/chord-progressions/matrix) (steps through all 12 keys) and [Solo](https://www.solotrainer.app/) (picks a new random key each pass).
  - **Plan:** the Maps are written in numbers, so re-rendering one in another key costs almost nothing and shows why the Number System matters.

### (i) Curriculum structure and progress

- **MUST: An open path with one clear "Continue".** Any key can be opened, and a recommended order is shown.
  - Drawn from Yousician's [unlocked path](https://support.yousician.com/hc/en-us/articles/206930639-How-the-guitar-learning-path-works). Counter-examples: Simply's strict lock ([Guitar Chalk](https://www.guitarchalk.com/simply-guitar-review/)) and a Guitar Tricks review saying there was "no clear way to see what lesson I should complete next" ([App Store](https://apps.apple.com/us/app/guitar-lessons-guitar-tricks/id931639254)).
  - **Plan:** teachers can start students in different keys.
- **MUST: The same lesson template in every key:** Melody → Chords → Play-Along, with identical sub-steps.
  - Drawn from [Pickup Music](https://help.pickupmusic.com/en/articles/10513997-understanding-class-types) and [Rocksmith+](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/7ncvKJE9PCWmNWNrqmU5WJ/rocksmith-dev-diary-late-may-2022-lessons).
  - **Plan:** predictability is itself neurodiverse-friendly.
- **MUST: An explicit "ready to move on" checklist for each key.**
  - Drawn from [JustinGuitar](https://www.justinguitar.com/guitar-lessons/module-1-practice-routine-b1-116): "at least 30 chord changes in one minute".
  - **Plan:** tie it to the pass bar in (e).
- **MUST: Save every result** (takes, drill counts, overrides) and sync across devices and instruments.
  - Counter-examples: Fender's scores "will NOT be saved" ([doc](https://fenderplay.zendesk.com/hc/en-us/articles/4410149175693-What-is-Feedback-Mode)), and JustinGuitar's app and website don't share progress ([Musopia](https://musopia.zendesk.com/hc/en-us/articles/360021893219-What-s-the-difference-between-the-courses-on-the-justinguitar-com-website-and-this-app)). Rocksmith+ syncs everywhere ([Ubisoft](https://www.ubisoft.com/en-us/game/rocksmith)).
  - **Plan:** results live in the backend.
- **SHOULD: A review queue that mixes in earlier keys' Maps and drills.**
  - Drawn from Yousician's [Missing Stars](https://support.yousician.com/hc/en-us/articles/201558312-How-to-navigate-in-Yousician), Musora's [interleaved and spaced practice](https://www.musora.com/the-new-musora-app), and [Wulf & Mornell](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf-Mornell-2008.pdf), who recommend alternating blocked and mixed practice.
  - **Plan:** "cycle back" across keys.
- **SHOULD: "Mark complete" for content that is too easy, and forgiving streaks.**
  - Drawn from Fender's [mark complete](https://fenderplay.zendesk.com/hc/en-us/articles/360025054332) and [weekly streak](https://fenderplay.zendesk.com/hc/en-us/articles/9861035828493-Streaks-FAQs), and Simply's [streak freezes](https://piano-help.hellosimply.com/en/articles/15932049-streaks-and-streak-freezes-in-simply-guitar).
  - **Plan:** less pressure.
- **SHOULD: Version lesson content and announce changes.**
  - Counter-example: bends that Yousician added to existing songs "surprised people" ([doc](https://support.yousician.com/hc/en-us/articles/360001881057-Why-songs-sometimes-change-in-Yousician)).
  - **Plan:** relevant for school deployments.
- **LATER: A skill view across keys, organised by number,** e.g. "your 3 min7 is weak in every key".
  - Drawn from Rocksmith+ [Skill Progress](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/49EG2FpjSvQSH2CXb0ySk3/rocksmith-dev-diary-march-2022-chord-charts-archi).
  - **Plan:** an analysis only the Hybrid Number System makes possible.
- **LATER: A simplification ladder for hard voicings:** root only, then a partial shape, then the full chord.
  - Drawn from [Rocksmith+](https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/6qfPe1LGEymsFyO5KbiYRJ/how-to-read-and-practice-guitar-chord-charts) and [Oolimo](https://www.oolimo.com/en/chord-types/barre-chords).
  - **Plan:** a way in to the 7th-chord shapes.

### (j) Accessibility

- **MUST: One global left-handed setting** that mirrors the fretboard, chord boxes and hand images on every surface, including the projector. Put a quick toggle on the fretboard itself. Tab stays standard.
  - Drawn from [Yousician](https://support.yousician.com/hc/en-us/articles/202773522-Left-handed-option), the [Soundslice hand icon](https://www.soundslice.com/blog/106/new-left-handed-fretboard-visualization/) and [Pickup's flipped video](https://help.pickupmusic.com/en/articles/10591947-how-to-use-the-interactive-notation). Counter-examples: [Simply](https://piano-help.hellosimply.com/en/articles/5811497-i-m-left-handed-how-do-i-follow-the-lessons) and [Fender](https://fenderplay.zendesk.com/hc/en-us/articles/115003267406-Do-you-offer-lessons-for-left-handed-players) have none, and UG's was mobile-only ([forum](https://www.ultimate-guitar.com/forum/showthread.php?t=1730980)).
  - **Plan:** a user setting that the Classroom v2 projector respects.
- **MUST: Key color is never the only signal.** Every element colored by key also shows the key name and a secondary glyph or pattern.
  - Drawn from [WCAG 1.4.1](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) and [CUD](https://jfly.uni-koeln.de/color/) (8 colorblind-safe colors, fewer than our 12 keys).
  - **Plan:** test the palette under protan, deutan and tritan simulation.
- **MUST: Colorblind presets plus a custom per-key color editor with Reset.** Shifting hues is not enough on its own.
  - Drawn from [Rocksmith+](https://www.ubisoft.com/en-us/help/article/000097646) and [Yousician](https://support.yousician.com/hc/en-us/articles/203751452-Game-tab). Counter-example: Rocksmith 2014's hue-shift mode, where the G and A strings still "blend in" for colorblind players ([Steam](https://steamcommunity.com/app/221680/discussions/0/3047182696773733043/)).
  - **Plan:** stored in settings.
- **MUST: Target, played and missed notes look different without color:** a fill, a ring and an icon.
  - Drawn from [WCAG 1.4.1](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html), which pairs color with pattern.
  - **Plan:** applies to the fretboard and the chord box states.
- **MUST: A low-stimulation, reduced-motion option.** Honour `prefers-reduced-motion`, and give toggles for effects, bouncing and flashing, plus a softer playhead.
  - Drawn from Rocksmith+ [Blackout mode and effects off](https://www.ubisoft.com/en-us/help/article/000097711) and Soundslice's [playhead styles](https://www.soundslice.com/help/en/player/advanced/292/playhead-style-color/).
  - **Plan:** the neurodiverse preset.
- **MUST: A text alternative for every chord box and fretboard state,** e.g. "D major: x x 0 2 3 2, fingers 1 3 2".
  - Drawn from [WCAG technique G14](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html).
  - **Plan:** generated from the same data as the box.
- **SHOULD: Full keyboard control, usable one-handed with no press-and-hold,** since the learner is holding a guitar.
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/player/tips/1/keyboard-shortcuts/) and [Rocksmith+](https://news.ubisoft.com/en-us/article/5XfINjoRmVJgBKR8fGt4EM): "No button holds are required".
  - **Plan:** reuses the transport shortcuts from (a).
- **SHOULD: Dyslexia-friendly text options.** Sans-serif type, 1.5 line spacing, bold instead of italics, an off-white background, and short chunked instructions.
  - Drawn from the [BDA style guide](https://www.adaptifyeducation.com/blog/bda-dyslexia-style-guide) and [BDA on music](https://www.bdadyslexia.org.uk/advice/adults/music-and-dyslexia-1).
  - **Plan:** set through theme tokens.
- **SHOULD: Plan to fade the color scaffold** (full color → tinted → plain) later in the book, or through a teacher toggle.
  - Drawn from [Figurenotes](https://drakemusicscotland.org/figurenotes/), which fades color in three stages, and [Rogers 1991](https://en.wikipedia.org/wiki/Colored_music_notation): students taught with colored notation read plain notation worse.
  - **Plan:** protects the transfer of skills to ordinary notation.

### (k) Classroom

- **MUST: A projector view that is paged (no scrolling),** with large tab, Map and fretboard. The teacher's device controls tempo, loop and count-in for the whole room.
  - Drawn from [Yousician's teaching guide](https://support.yousician.com/hc/en-us/articles/208109709-How-to-include-Yousician-in-your-teaching) and [Soundslice's paged layout](https://www.soundslice.com/blog/241/introducing-our-new-paged-layout/).
  - **Plan:** the Classroom v2 PartyKit teacher and projector sockets.
- **MUST: Start each lesson with a class tune-up.** The teacher sees each student's "tuned" status.
  - Drawn from [Yousician's teaching flow](https://support.yousician.com/hc/en-us/articles/208109709-How-to-include-Yousician-in-your-teaching).
  - **Plan:** student devices report their tuner state over PartyKit.
- **MUST: Two explicit room modes.** "Group play" is ungraded and led from the projector. "Individual take" is graded and needs headphones plus a close mic or an interface.
  - In Yousician's teacher-jam setup, only the student's input channel is scored ([doc](https://support.yousician.com/api/v2/help_center/en-us/articles/205877862.json)). Room noise defeats phone mics ([Stringshock](https://stringshock.com/simply-guitar-app-review/)).
  - **Plan:** avoids promising grades that detection in a live room can't deliver.
- **SHOULD: A teacher dashboard.** It shows each student's progress by key, their practice time, and recorded takes that teachers can comment on.
  - Drawn from [Moosiko](https://moosiko.com/), [PracticeFirst](https://www.musicfirst.com/software/practicefirst) (recordings shown next to the automatic score) and [Soundslice Performances](https://www.soundslice.com/blog/150/announcing-performances/). Fender's equivalent is asking students to share their My Path page.
  - **Plan:** builds on the Teacher Office and classroom data.
- **SHOULD: Rubric export** (chords, transitions and progressions scored 0–3) with standards alignment.
  - Drawn from [Moosiko rubrics](https://moosiko.com/blog/guitar-class-rubrics-assessment/) and [Fender's Level 1 plan](https://play-instructor.fender.com/hc/en-us/articles/31048190692365-FREE-Level-1-Curriculum-Map-Teaching-Plan), which is aligned to NAfME.
  - **Plan:** something schools can hand in for assessment.
- **SHOULD: A tempo-ladder class game.** Loop a phrase starting at 50% tempo; each clean turn adds 5%.
  - Drawn from Yousician's teacher game ["Beat Your Buddy"](https://support.yousician.com/hc/en-us/articles/208001169-Classroom-game-to-play-with-Yousician).
  - **Plan:** turn-taking over PartyKit.
- **SHOULD: Different students can work in different keys at once,** and the teacher controls release pace (everything at once, or weekly).
  - Drawn from [Soundslice](https://www.soundslice.com/help/en/teaching/teaching/222/educational-approaches/) and [Yousician](https://support.yousician.com/hc/en-us/articles/204793951-Can-my-students-start-practice-at-different-levels).
  - **Plan:** set per assignment.
- **LATER: LMS integration** (single sign-on, rostering, grade passback) through an aggregator, and a mirrored "teacher facing student" fretboard.
  - Drawn from [Fender via Edlink](https://ed.link/community/new-client-announcement-fender-play-foundation/), which is only a stated goal, and [Oolimo's Fretboarder](https://www.oolimo.com/en/tools/fretboarder).

## 3. Anti-patterns to avoid

**Detection**

- **Missed low strings.**
  - Low E and A on an acoustic are missed ([Apple](https://support.apple.com/en-nz/101706)).
  - Simply Guitar: "Awful at detecting the E and A strings, even at full volume" ([App Store](https://apps.apple.com/us/app/simply-guitar-learn-guitar/id1476695335?see-all=reviews)).
  - The JustinGuitar app missed the low E on an old iPad and did better with fingers than with a pick ([community](https://community.justinguitar.com/t/wont-detect-my-sounds/379569)).
- **Noise accepted as playing.**
  - A cough scored as Fmaj7 and a pick scrape as E minor ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
  - Notes "pop up green even tho I'm not even playing" ([justuseapp](https://justuseapp.com/en/app/1476695335/simply-guitar-by-joytunes/reviews)).
  - Yousician's chord engine "produces a lot of false positives" ([Tone Island](https://toneisland.com/apps-to-learn-guitar/)).
- **Hearing its own backing track.** Seen in [Yousician](https://justuseapp.com/en/app/959883039/yousician-learn-play-guitar/reviews) and [Simply](https://apps.apple.com/us/app/simply-guitar-learn-guitar/id1476695335?see-all=reviews).
- **A ringing chord counted as several strums,** so strumming can't be assessed ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).
- **Bias between chords.** In JustinGuitar, Am and D took "several seconds" while E and Em registered almost instantly ([community](https://community.justinguitar.com/t/chord-detection-issues/397102)).
- **Having to repeat yourself.** Fretello users play a note "four or five times" before it registers ([mwm](https://mwm.ai/apps/fretello-guitar-lessons/1107957482)); Guitar Blast takes "2-4 times" ([App Store](https://apps.apple.com/us/app/guitar-blast-learn-fretboard/id1483606692)).
- **Too lenient.** Rocksmith 2014 counted 1 of 3 notes as hits ([Steam](https://steamcommunity.com/app/221680/discussions/0/541906989393368380)). Uberchord's strumming lessons pass "as long as you play anything at all" ([justuseapp](https://justuseapp.com/en/app/952669753/uberchord-guitar-lessons/reviews)).
- **Too strict, behind a gate.** Simply rewinds the lesson and blocks progress ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)). This leads to over-strumming, blisters, and a review titled "Causing nervousness panic" ([justuseapp](https://justuseapp.com/en/app/1476695335/simply-guitar-by-joytunes/reviews)).

**Latency and timing**

- **Bluetooth latency.** Yousician's Mixer stops working when it detects extra latency ([doc](https://support.yousician.com/hc/en-us/articles/202893381-Can-I-use-Bluetooth-headphones)), Simply warns about it too ([doc](https://piano-help.hellosimply.com/en/articles/6243945-which-headphones-can-i-use)), and Ubisoft publishes console audio-latency advice ([Ubisoft](https://www.ubisoft.com/en-gb/game/rocksmith/plus/news-updates/0ObO0tPaR4kiGmmgpkeJZ/minimizing-audio-latency-on-console)).
- **Drift that survives calibration.** Gibson drifts "even within a single exercise" ([Play Store](https://play.google.com/store/apps/details?id=com.zoundio.amped)), and its tracking is "sometimes laggy" ([Guitar Player](https://www.guitarplayer.com/lessons/gibson-learn-to-play-guitar-review)).
- **An unreliable time reference.** Chordify's metronome lags "at certain speeds" ([EAS](https://www.educationalappstore.com/app/chordify-chords-for-any-song)).
- **"Smart" auto-follow that guesses wrong.** UG's smart scroll "stops scrolling because it seems to be waiting for a chord. other times it gets way ahead" ([forum](https://www.ultimate-guitar.com/forum/showthread.php?t=2546103)).

**Noise, the room, and hardware**

- **Echo and background noise cause missed chords** ([Stringshock](https://stringshock.com/simply-guitar-app-review/)).
- **Hardware requirements that aren't disclosed.** Rocksmith+'s phone mic struggled with an amplified electric, and the cable was "a necessity – something that's unfortunately not made immediately clear" ([guitar.com](https://guitar.com/reviews/accessories/ubisoft-rocksmith-review/)).

**UX and trust**

- **One palette used for two meanings** ([Guitar Chalk comment](https://www.guitarchalk.com/yousician-review/)).
- **Wait-mode toggle wording that can be read either way** ([Yousician](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar)).
- **Feedback that fails the learner.**
  - Pass/fail with no diagnosis ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/), [Uberchord](https://justuseapp.com/en/app/952669753/uberchord-learn-guitar/reviews)).
  - Detail hidden on low scores, and results thrown away ([Fender](https://fenderplay.zendesk.com/hc/en-us/articles/4410149175693-What-is-Feedback-Mode)).
- **Color scaffolds that never fade** ([Rogers](https://en.wikipedia.org/wiki/Colored_music_notation)), and colorblind modes that only shift hues ([Steam](https://steamcommunity.com/app/221680/discussions/0/3047182696773733043/)).
- **Visual instability.** Zoom and flashing on a 3D note highway ([CustomsForge](https://customsforge.com/topic/67566-struggling-to-get-used-to-rocksmith-tabs/)), and a fretboard that resizes between levels ([Guitar Blast](https://apps.apple.com/us/app/guitar-blast-learn-fretboard/id1483606692)).
- **No pause or exit from an exercise** ([Uberchord](https://justuseapp.com/en/app/952669753/uberchord-guitar-lessons/reviews)).
- **Interruptions during practice.** Songsterr's free tier pauses every 10 bars ([Plus](https://www.songsterr.com/plus)); UG shipped an unskippable survey at launch ([UG](https://www.ultimate-guitar.com/news/ug_news/introducing_practice_mode_in_the_ultimate_guitar_app_music-learning_powered_by_machine-learning.html)).
- **Rewarding points over musicianship** ([Guitar Start Guide](https://www.guitarstartguide.com/rocksmith-review/), [Pract.is](https://pract.is/blog/yousician-review-guitar-vs-piano-2026)).
- **Content changed without notice** ([Yousician](https://support.yousician.com/hc/en-us/articles/360001881057-Why-songs-sometimes-change-in-Yousician)).
- **Features that differ by platform.** Gibson's Stop & Go is iOS-only ([FAQ](https://www.gibson.app/faq)), and UG Practice for Official Tabs isn't on Android ([UG](https://help.ultimate-guitar.com/en/articles/14588372-what-is-ultimate-guitar-practice-subscription)). We need parity across browsers.
- **Teacher tools that get discontinued** ([Yousician](https://yousician.com/teachers)).
- **Onboarding questions that change nothing** ([guitar.com](https://guitar.com/reviews/accessories/simply-guitar-review/)).

## 4. Open product questions

1. **Feedback per string or per chord tone?** The chroma detector sees pitch classes, not strings.

   - Option A: tone-level feedback when strumming ("missing the 3"), with per-string marks only in arpeggiate mode and on MIDI guitar.
   - Option B: first evaluate Studio's `PolyphonicNoteTracker` (built for Guitar-to-MIDI) for per-string feedback on strums in Learn.

   The answer decides what the chord box can honestly show.

2. **Gating and overrides.** Do we have an open path, or unlock keys one at a time? What is the pass bar (e.g., 80% at the target tempo in 2 of 3 takes)? Does a learner's "I played it" override count toward completion, and toward grades the teacher can see?
3. **Key colors for colorblind users, and telling chords apart.**
   - Twelve hues can't all be distinct for colorblind users. Which secondary cue ships in v1: key letter, glyph or pattern?
   - Within a Map, are chords told apart only by number and box, or also by tints of the key color?
   - Does color fade in later chapters of the book?
4. **Classroom scoring.** Is graded individual scoring in a live room a v1 promise? That would require headphones plus a close mic or interface per student. Or does v1 offer ungraded group play in class, with graded takes done individually or as homework?
5. **Devices and timing tolerance.**
   - Which inputs and devices are v1: Chromebook and iPad Safari mic, USB interface, MIDI guitar?
   - Given the measured latency on those, what timing tolerance can "Keep time" honestly score?
   - Do we turn off in-time grading on Bluetooth output?
