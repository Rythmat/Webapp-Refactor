/* eslint-env node */
/**
 * The kitchen sink for the reload round-trip suite (roundtrip.mjs): one page
 * function that gives every field of the audit's persistence matrix a value
 * that is NOT its default (docs/studio-audit-2026-10/areas.md on branch
 * studio/audit-archive, section state-reload, "MATRIX"), so a reload path that
 * drops or resets a field shows up as a difference in the fingerprint
 * (fingerprint.mjs).
 *
 *   await page.evaluate(applyKitchenSink, { assetId });
 *
 * It runs in the editor page (the dev auth bypass exposes the stores on
 * window), so it must be self-contained: Playwright sends the function's
 * source, not its closure. It edits through the stores' own actions wherever
 * one exists (tracksSlice, prismSlice, uiSlice, transportSlice,
 * masteringSlice, returnsSlice, markersSlice, tutorialSlice and the Oracle
 * Synth store), so it walks the same code a click would; the one raw
 * setState (measuresPerLine) is a field only seeders write that way.
 *
 * `assetId` is an audio asset the mock Studio API already holds
 * (mockStudioApi.mjs `seedAsset`). The guitar track gets a clip on it, which
 * the editor downloads through the mock like any uploaded recording.
 *
 * The Vocals track gets a second kind of audio: an imported clip whose bytes
 * exist only in memory, the way a Library sample drop leaves one
 * (Timeline.tsx: decoded buffer and original bytes in AudioBufferStore, no
 * asset). Nothing uploads it until the next cloud save, so a refresh or a
 * tab close shows what happens to audio that never reached the Studio API
 * (engine-hooks-16), and the cloud round trip takes the save's upload path
 * (POST /assets, the signed PUT, finalize).
 *
 * Values are chosen so a reset is visible: each differs from the slice
 * default AND from what a load would re-derive (trackRole differs from
 * guessTrackRole, audioInputChannel from the guitar default {mono, 0}).
 */

/**
 * Applies the kitchen sink to the open editor. Returns the ids it created,
 * so scenarios can address them (the synth track, the clips, the regions).
 */
export async function applyKitchenSink({ assetId = null } = {}) {
  const store = window.__MA_STORE__;
  const synth = window.__MA_SYNTH_STORE__;
  if (!store || !synth) throw new Error('editor stores are not exposed');
  const act = () => store.getState();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (what, test, timeout = 15_000) => {
    const start = performance.now();
    while (!test()) {
      if (performance.now() - start > timeout) {
        throw new Error(`kitchen sink: timed out waiting for ${what}`);
      }
      await sleep(50);
    }
  };
  // The per-track synth patch cache is module state with no window handle;
  // the dev server serves each source module at one URL, so importing that
  // URL gives the very instance the editor uses (checked below). The browser
  // resolves these URLs, not node, hence a specifier the linter skips.
  const devModule = (url) => import(url);
  const synthTrackState = await devModule(
    '/src/daw/oracle-synth/synthTrackState.ts',
  );
  const synthModule = await devModule('/src/daw/oracle-synth/store/index.ts');
  if (synthModule.useSynthStore !== synth) {
    throw new Error('the synth store module is not the editor instance');
  }

  // ── Lesson context first: its step's preconditions (channel strip tab)
  // apply on arrival, and the view fields set at the end override them. A
  // free-form step (no check, so no auto-advance) keeps the lesson put
  // while the rest of the sink is applied.
  const lessons = await devModule('/src/daw/components/Tutorial/tutorials.ts');
  const steps = lessons.getTutorial('make-first-track')?.steps ?? [];
  const freeForm = steps.findIndex(
    (step, i) => i > 0 && !step.check && !step.synthCheck,
  );
  if (freeForm < 0) {
    throw new Error('kitchen sink: make-first-track has no free-form step');
  }
  act().startTutorial('make-first-track');
  act().goToTutorialStep(freeForm);
  await sleep(100);

  // ── Project and transport ──
  act().setProjectName('Kitchen Sink');
  act().setComposerName('Round Trip');
  act().setBpm(97);
  act().setTimeSignature(6, 8);
  act().setLoopRange(1920, 9600);
  act().setLoopEnabled(true);
  act().toggleMetronome();
  act().setCountInBars(2);
  act().setPosition(960);
  act().setLastSeekPosition(960);

  // ── Key before tracks: setRootNote/setMode repaint every track with the
  // key colour, so the explicit colours below must come after them.
  act().setRootNote(2);
  act().setMode('dorian');
  act().toggleRootLock();

  // ── Tracks ──
  const add = (type, instrument, name) => {
    const id = act().addTrack(type, instrument, name);
    if (!id) throw new Error(`kitchen sink: could not add track ${name}`);
    return id;
  };
  const lead = add('midi', 'oracle-synth', 'Lead Synth');
  const keys = add('midi', 'piano-sampler', 'Keys');
  const guitar = add('audio', 'guitar-fx', 'Guitar');
  const drums = add('midi', 'drum-machine', 'Drums');
  const organ = add('midi', 'tonewheel-organ', 'Organ');
  const bass = add('midi', 'bass-electric', 'Bass');
  const vocals = add('audio', 'vocal-fx', 'Vocals');
  const chops = add('midi', 'sampler', 'Chops');
  const strings = add('midi', 'soundfont', 'Strings');

  const palette = {
    [lead]: '#e4572e',
    [keys]: '#29335c',
    [guitar]: '#f3a712',
    [drums]: '#a8c686',
    [organ]: '#669bbc',
    [bass]: '#8338ec',
    [vocals]: '#ff006e',
    [chops]: '#3a86ff',
    [strings]: '#06d6a0',
  };
  for (const [id, color] of Object.entries(palette)) {
    act().updateTrack(id, { color });
  }

  // Mixer, routing and roles. trackRole values differ from guessTrackRole
  // ('Keys' and 'Vocals' guess 'auto'), so a re-guess on load is a loss.
  act().updateTrack(lead, { volume: 0.66, pan: -0.25 });
  act().updateTrack(keys, {
    trackRole: 'chords',
    midiInputId: 'kitchen-midi-in',
    presetName: 'Bright Grand',
  });
  act().updateTrack(guitar, {
    audioInputId: 'kitchen-audio-in',
    audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
  });
  act().updateTrack(vocals, { trackRole: 'melody' });
  act().updateTrack(bass, { bassVoice: 'upright' });
  act().updateTrack(strings, { gmProgram: 48 });
  act().toggleSolo(keys);
  act().toggleMute(bass);
  act().toggleRecordArm(drums);
  act().toggleMonitoring(drums);

  // Effects, sends and automation.
  act().addActiveEffect(lead, 'reverb');
  act().updateTrackEffects(lead, {
    reverb: {
      ...act().tracks.find((t) => t.id === lead).effects.reverb,
      enabled: true,
      decay: 3.3,
      wet: 0.45,
    },
  });
  act().addActiveEffect(keys, 'delay');
  act().setSend(lead, 'A', 0.37);
  act().setSend(keys, 'B', 0.21);
  act().upsertAutomationPoint(lead, 'volume', { tick: 0, value: 0.5 });
  act().upsertAutomationPoint(lead, 'volume', { tick: 3840, value: 0.9 });
  act().upsertAutomationPoint(keys, 'pan', { tick: 1920, value: 0.25 });

  // Instrument state: chains, kit, pads, organ, sampler.
  act().setGuitarChain(guitar, [
    {
      type: 'overdrive',
      enabled: true,
      params: { drive: 0.62, tone: 0.41, volume: 0.7 },
    },
    {
      type: 'chorus',
      enabled: false,
      params: { rate: 0.3, depth: 0.55, mix: 0.4 },
    },
  ]);
  act().setVocalChain(vocals, [
    {
      type: 'compressor',
      enabled: true,
      params: { threshold: 0.42, ratio: 0.5, attack: 0.2, release: 0.5 },
    },
  ]);
  act().setDrumKit(drums, '808');
  act().updateDrumPad(drums, 36, { volume: 0.92, pan: -0.1 });
  act().updateDrumPad(drums, 38, { volume: 0.61, pan: 0.2 });
  act().updateTrack(organ, {
    organState: {
      drawbars: [8, 8, 6, 4, 3, 2, 0, 0, 0],
      clickLevel: 0.3,
      percEnabled: true,
      percHarmonic: '3rd',
      percVolume: 'soft',
      percDecay: 'slow',
      vibratoMode: 'C3',
      overdrive: 0.25,
      leslieSpeed: 'fast',
      leslieEnabled: true,
      swellLevel: 0.85,
    },
  });
  act().setSamplerSample(chops, {
    sampleId: 'kitchen-chop-1',
    assetId: null,
    sourceUrl: '/daw-assets/samples/chops/demo-vox-c4.wav',
    rootNote: 'C4',
    attack: 0.01,
    release: 0.4,
    name: 'Kitchen Chop',
  });

  // ── Clips. The Keys clip carries a length and sustain-pedal data, the two
  // clip fields the serializers drop (state-reload-13).
  const note = (n, start, dur, velocity = 90) => ({
    note: n,
    velocity,
    startTick: start,
    durationTicks: dur,
    channel: 0,
  });
  const leadClip = 'kitchen-clip-lead';
  act().addMidiClip(lead, {
    id: leadClip,
    name: 'Lead Line',
    startTick: 0,
    events: [
      note(74, 0, 480),
      note(76, 480, 480),
      note(77, 960, 960),
      note(81, 1920, 480),
      note(79, 2400, 480),
      note(77, 2880, 960),
    ],
  });
  const keysClip = 'kitchen-clip-keys';
  act().addMidiClip(keys, {
    id: keysClip,
    name: 'Comping',
    startTick: 0,
    durationTicks: 7680,
    events: [
      ...[50, 53, 57, 60].map((n) => note(n, 0, 1920, 80)),
      ...[55, 59, 62, 65].map((n) => note(n, 1920, 1920, 80)),
      ...[52, 55, 59, 62].map((n) => note(n, 3840, 1920, 80)),
      ...[57, 60, 64, 67].map((n) => note(n, 5760, 1920, 80)),
    ],
    ccEvents: [
      { tick: 0, controller: 64, value: 127, channel: 0 },
      { tick: 1900, controller: 64, value: 0, channel: 0 },
      { tick: 1920, controller: 64, value: 127, channel: 0 },
    ],
  });
  act().addMidiClip(drums, {
    id: 'kitchen-clip-drums',
    name: 'Beat',
    startTick: 0,
    events: [
      note(36, 0, 120, 110),
      note(42, 240, 60, 70),
      note(38, 480, 120, 100),
      note(42, 720, 60, 70),
    ],
  });
  const guitarClip = 'kitchen-clip-guitar';
  if (assetId) {
    // The editor downloads and decodes it itself (useCollabAudioLoader).
    act().addAudioClip(guitar, {
      id: guitarClip,
      startTick: 0,
      duration: 1920,
      fadeInTicks: 120,
      fadeOutTicks: 240,
      assetId,
      offsetSeconds: 0.1,
      gain: 0.8,
    });
    // Pitch-correction edits are keyed by audio clip (state-reload-14).
    act().setPitchSegments(guitarClip, [
      {
        id: 'kitchen-seg-1',
        startTimeMs: 0,
        endTimeMs: 400,
        medianFreqHz: 220,
        midiNote: 57,
        centsOffset: 12,
        pitchContour: [219, 220, 221],
      },
    ]);
    act().addPitchEdit(guitarClip, 'kitchen-seg-1', 59);
  }

  // An imported clip with no asset yet: the decoded audio and the original
  // bytes go into the editor's AudioBufferStore, as a Library sample drop
  // puts them (Timeline.tsx handleDrop), and only a cloud save uploads them.
  const audioBuffers = await devModule('/src/daw/audio/AudioBufferStore.ts');
  const importedClip = 'kitchen-clip-imported';
  const response = await fetch('/daw-assets/samples/chops/demo-vox-c4.wav');
  if (!response.ok) {
    throw new Error(
      `kitchen sink: sample download failed (${response.status})`,
    );
  }
  const bytes = await response.arrayBuffer();
  // decodeAudioData may detach its input, so keep a copy for the upload.
  const original = bytes.slice(0);
  const decoded = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(
    bytes,
  );
  audioBuffers.setAudioBuffer(importedClip, decoded);
  audioBuffers.setOriginalAudio(importedClip, original, 'audio/wav');
  act().addAudioClip(vocals, {
    id: importedClip,
    startTick: 1920,
    duration: Math.max(
      1,
      Math.round((decoded.duration / 60) * act().bpm * 480),
    ),
    fadeInTicks: 0,
    fadeOutTicks: 0,
  });

  // ── Oracle Synth patch. The patch lives in the synth store and reaches a
  // track only through the panel's store bridge, so open the Lead's panel,
  // edit, and close it (the bridge caches the patch on unmount). These edits
  // write nothing to the main store (state-reload-06).
  act().setCurrentView('arrange');
  act().setSelectedTrackId(lead);
  act().setChannelStripTab('controls');
  await waitFor(
    'the synth panel bridge',
    () => synthTrackState.getActiveSynthTrack() === lead,
  );
  synth.getState().setFilterParam(0, 'cutoff', 2345);
  synth.getState().setFilterParam(0, 'resonance', 0.42);
  synth.getState().setPitchBendRange(7);
  synth.getState().setMasterVolume(0.61);
  act().setChannelStripTab(null);
  await waitFor(
    'the synth panel to close',
    () => synthTrackState.getActiveSynthTrack() === null,
  );
  const patch = synthTrackState.getTrackSynthState(lead);
  if (patch?.filters?.[0]?.cutoff !== 2345) {
    throw new Error('kitchen sink: the synth edit did not reach the track');
  }

  // ── Prism builder (the progression, strum, tilt, filter, record mode).
  // selectGenre picks a random rhythm for the genre, so set one explicitly
  // after it (neither the slice default nor resetSessionToEmpty's).
  act().selectGenre('Jazz');
  act().setRhythm('Jazz 2a');
  act().setSwing(37);
  act().setStrumMode(2);
  act().setStrumAmount(35);
  act().setTiltMode(3);
  act().setTiltAmount(40);
  act().setFilterPercent(0.6);
  for (let i = 0; i < 3; i++) {
    const options =
      i === 0 ? act().availableFirstChords : act().availableNextChords;
    if (options.length > 0) act().addChord(options[i % options.length]);
  }
  act().toggleChordRulerLabels();

  // ── Chord lane, in the lane's own naming: hybrid `name`, letter
  // `noteName`, and `degreeKey` counted from the tonic with the full quality
  // (the Insight panel parses it). Ids come from the store's own counter
  // (setChordRegions tags regions without one): state-reload-05.
  act().setChordRegions(
    [
      ['1 min7', 'D min7', '1 minor7', [120, 80, 200], [50, 53, 57, 60]],
      ['4 dom7', 'G dom7', '4 dominant7', [200, 120, 80], [55, 59, 62, 65]],
      ['2 min7', 'E min7', '2 minor7', [80, 200, 120], [52, 55, 59, 62]],
      ['5 min7', 'A min7', '5 minor7', [200, 80, 120], [57, 60, 64, 67]],
    ].map(([name, noteName, degreeKey, color, midis], i) => ({
      startTick: i * 1920,
      endTick: (i + 1) * 1920,
      rawStartTick: i * 1920 + 12,
      name,
      noteName,
      color,
      degreeKey,
      midis,
      confidence: 0.9,
    })),
    true,
  );
  act().setChordRecordMode('merge');
  // A chord written in the lead sheet after the lane, then one region marked
  // as melody (it leaves the lane and is remembered in melodyOverrides).
  act().insertChordRegion(8640, 'b6 maj7', 'Bb maj7', [90, 90, 220]);
  const regionIds = act().chordRegions.map((r) => r.id);
  act().markAsMelody(regionIds[regionIds.length - 1]);

  // ── Lead sheet and Score marks. Score marks are keyed by note id
  // (`trackId:clipId:startTick:note`, scoreParts.ts) and chord marks by
  // `trackId:regionId`, so they are built from the real ids.
  const noteId = (track, clip, start, n) => `${track}:${clip}:${start}:${n}`;
  const firstRegion = act().chordRegions[0].id;
  store.setState({ measuresPerLine: 3 });
  act().setMeasureRowSizes([2, 2, 1]);
  act().setMeasureRestMap({ 4: 2 });
  act().setMeasureFermatas([3]);
  act().setLeadSheetSections([
    { measureIdx: 0, label: 'A' },
    { measureIdx: 2, label: 'B' },
  ]);
  act().setLeadSheetRepeats([{ startMeasure: 0, endMeasure: 1 }]);
  act().setLeadSheetChordFormat('jazz');
  act().setLeadSheetShowRepeats(true);
  act().setLeadSheetShowMelody(true);
  act().setLeadSheetMelodyTrackId(lead);
  act().toggleScoreChordTrack(keys);
  act().setScoreChordHidden([`${keys}:${firstRegion}`]);
  act().setScoreArticulations([
    `${noteId(lead, leadClip, 0, 74)}|staccato`,
    `${noteId(lead, leadClip, 960, 77)}|fermata`,
  ]);
  act().setScoreSlurs([
    `${noteId(lead, leadClip, 0, 74)}|${noteId(lead, leadClip, 480, 76)}`,
  ]);
  act().setScoreSpellings([`${noteId(lead, leadClip, 1920, 81)}|A`]);
  act().setScoreSystemBreaks([2]);
  act().setScorePageBreaks([4]);
  act().setScoreSystemRuns([[0, 2]]);
  act().setScoreTextMarks([
    { id: 'kitchen-text-1', measureIdx: 1, kind: 'text', text: 'dolce' },
    { id: 'kitchen-segno-1', measureIdx: 2, kind: 'segno' },
  ]);
  act().setScoreSlashNotes([noteId(keys, keysClip, 0, 50)]);

  // ── Markers, mastering, Master bus and returns ──
  act().addMarker(0, 'Intro', '#ff5577');
  act().addMarker(3840, 'Verse');
  act().setMasteringStyle('warm');
  act().setMasteringEq('low', 3);
  act().setMasteringEq('high', -2);
  act().setMasteringPresence(70);
  act().setMasteringDeEsser({ amount: 30, frequency: 7000 });
  act().setMasteringLoudness(1.5);
  act().setMasteringStereoField('wide');
  act().setMasteringDynamics({
    compression: 65,
    character: 40,
    saturation: 20,
  });
  act().setMasteringAmount(80);
  act().addMasteringFx('saturator');
  act().toggleMasteringBypass();
  act().setMasterVolume(0.55);
  act().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.7 });
  act().upsertMasterAutomationPoint('volume', { tick: 7680, value: 0.4 });
  act().setReturnVolume('A', 0.42);
  act().addReturnFx('A', 'eq');
  act().updateReturnEffects('B', {
    delay: {
      ...act().returns.find((r) => r.id === 'B').effects.delay,
      time: 0.5,
      feedback: 0.45,
    },
  });

  // ── Practice context: the session a Theory practice track carries, left
  // while the student is in the full Studio (currentView is not 'practice').
  act().setPracticeSession({
    kind: 'theory',
    mode: 'dorian',
    rootParam: 'd',
    level: 2,
    openTrack: 'chords',
  });

  // ── View state last (zoom, scroll, grid, tool, selection, panels, view).
  act().setTimelineZoom(2.5);
  act().setTimelineScrollLeft(120);
  act().setTimelineGridSize('1/8');
  act().toggleTimelineSnap();
  act().toggleTripletMode();
  act().setActiveTool('pencil');
  act().setSelectedTrackId(keys);
  act().setSelectedClip(keysClip, keys);
  act().setAutomationOpenTrackId(lead);
  act().setAutomationParamId('pan');
  act().setChannelStripTab('fx');
  act().setCurrentView('leadsheet');
  await sleep(50);

  return {
    trackIds: {
      lead,
      keys,
      guitar,
      drums,
      organ,
      bass,
      vocals,
      chops,
      strings,
    },
    clipIds: {
      leadClip,
      keysClip,
      guitarClip: assetId ? guitarClip : null,
      importedClip,
    },
    regionIds: act().chordRegions.map((r) => r.id),
  };
}
