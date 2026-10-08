/* eslint-env node */
/**
 * The fingerprint for the reload round-trip suite (roundtrip.mjs): a
 * normalised snapshot of the editor's state, field by field, so two snapshots
 * taken around a reload, a SPA return, a cloud save and reopen, or a boot can
 * be compared.
 *
 *   await context.addInitScript(installDevModules);   // before the editor loads
 *   const before = await page.evaluate(fingerprintPage);
 *   ...
 *   const diffs = compareFingerprints(before, after, { classes: ['doc'] });
 *
 * Normalisation. A cloud load re-mints audio-clip ids (and the track ids of
 * saves without settings.sourceTrackId), and a new page mints new ids for
 * anything a draft doesn't hold, so values never carry raw ids: every
 * reference is rewritten to a position token (track `T2`, MIDI clip `T2.M0`,
 * audio clip `T2.A0`, chord region `R1`; an id that resolves to nothing
 * becomes `?`, an id outside the lane `X0`). A Score mark on note
 * `trackId:clipId:480:62` reads `T0:T0.M0:480:62`, with ` (no such note)`
 * when the clip has no such note, so a mark left dangling shows as wrong,
 * and with ` (by note id)` when it names its note by id, which only the
 * draft does (decision D2 keeps marks positional in memory, where Score
 * looks them up). Raw ids are kept apart in `ids`, which compareFingerprints
 * checks as id stability on their own. A note's id is left out of its clip's
 * events hash and checked there too (`ids.notes`), so a load that re-derives
 * note ids shows once, as ids, and never as changed notes. An Oracle patch
 * that follows the project's key leaves the key it copies out of its hash.
 *
 * Classes. Each field names the registry entries it shows
 * (src/daw/persistence/projectDocument/fields.ts, read in the page), and its
 * class comes from them, so the harness and the codec agree on what a field
 * is (FIELD_CLASSES below). The fields of a track, a clip, a chord region and
 * a marker are generated from the registry outright, so a field added there
 * is fingerprinted without an edit here; every project-level doc, view and
 * pref key must be shown by some field, or `meta.coverage` names it and the
 * suite refuses to run.
 *
 * fingerprintPage runs in the editor page and must be self-contained. The
 * registry, the Oracle Synth patch cache, the decoded-audio store and the
 * sampler helpers have no window handle, so it imports their modules from
 * the dev server through installDevModules, which finds the URL the editor
 * itself loaded each one from; `meta.moduleAccess` says whether those
 * imports are the editor's own instances.
 */

/**
 * What each class of field is, and so which scenarios compare it
 * (roundtrip.mjs COMPARE).
 */
export const FIELD_CLASSES = {
  doc: 'the project (registry scope doc); `cloud` says whether today’s cloud payload carries it (legacy) or only the milestone 1.5 document will (document)',
  view: 'how the project was last seen on this device (scope view): in the draft only',
  pref: 'the student’s settings (scope pref), kept per user apart from any project',
  'track-local':
    'a track field this person keeps for themself (arm, monitor, inputs): in the draft only',
  derived:
    'a session key every load works out again from the project (the key colour)',
  context:
    'the lesson or practice screen the project was opened for: session state until milestone 1.15',
  runtime:
    'whether decoded audio is there: the bytes of a clip never uploaded live only in memory until milestone 1.4',
  session: 'never saved; every new project starts it over',
};

/** The raw id lists `ids` holds, each checked for re-minted ids. */
export const ID_KINDS = [
  'tracks',
  'midiClips',
  'audioClips',
  'chordRegions',
  'markers',
  'notes',
];

/** The yes/no id facts `ids` holds; going from yes to no is a loss. */
export const ID_FLAGS = ['chordRegionIdsUnique', 'noteIdsUnique'];

/**
 * Init script (context.addInitScript) for every page fingerprintPage or the
 * kitchen sink runs in. After a hot update the dev server serves a module as
 * `path?t=…` and the app imports that URL, so importing the bare path from
 * the page would load a second copy of the module: another store. The URLs
 * the page loaded are in its resource timings, whose buffer holds only 250
 * entries by default (the editor loads thousands of modules in dev), so it
 * is raised before anything loads. `window.__RT_DEV_MODULE__(path)` imports
 * the URL the page last loaded `path` from, or the bare path when it never
 * loaded it.
 */
export function installDevModules() {
  if (window.__RT_DEV_MODULE__) return;
  try {
    performance.setResourceTimingBufferSize(1_000_000);
  } catch {
    // A page without resource timing imports bare paths below.
  }
  window.__RT_DEV_MODULE__ = (path) => {
    const own = `${location.origin}${path}`;
    const loaded = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name === own || name.startsWith(`${own}?`));
    return import(loaded.at(-1) ?? path);
  };
}

/** Runs in the page. Returns { fields, ids, meta }. */
export async function fingerprintPage() {
  const store = window.__MA_STORE__;
  if (!store) throw new Error('editor store is not exposed');
  const s = store.getState();

  // ── Helpers (inline: this function is sent to the page as source) ──
  const canon = (value) => {
    if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
    if (value && typeof value === 'object') {
      const keys = Object.keys(value)
        .filter((k) => value[k] !== undefined)
        .sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
  };
  const hash = (value) => {
    // FNV-1a over the canonical JSON: short, stable, good enough to tell
    // two snapshots of the same data apart from different data.
    const text = canon(value);
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const plain = (value) =>
    value === undefined ? null : JSON.parse(JSON.stringify(value));

  // ── Modules without a window handle ──
  const meta = {
    path: location.pathname + location.search,
    takenAt: Date.now(),
    isPlaying: s.isPlaying,
    moduleAccess: 'ok',
    coverage: { missing: [] },
    autosave: null,
  };
  const devModule = window.__RT_DEV_MODULE__;
  let registry = null;
  let synthTrackState = null;
  let audioBuffers = null;
  let samplerChops = null;
  if (!devModule) {
    meta.moduleAccess =
      'error: the page has no dev-module resolver (installDevModules)';
  } else {
    try {
      const [storeModule, synthModule, fields, sts, abs, chops] =
        await Promise.all([
          devModule('/src/daw/store/index.ts'),
          devModule('/src/daw/oracle-synth/store/index.ts'),
          devModule('/src/daw/persistence/projectDocument/fields.ts'),
          devModule('/src/daw/oracle-synth/synthTrackState.ts'),
          devModule('/src/daw/audio/AudioBufferStore.ts'),
          devModule('/src/daw/instruments/samplerChops.ts'),
        ]);
      if (
        storeModule.useStore !== store ||
        synthModule.useSynthStore !== window.__MA_SYNTH_STORE__
      ) {
        meta.moduleAccess = 'mismatch';
      } else {
        registry = fields;
        synthTrackState = sts;
        audioBuffers = abs;
        samplerChops = chops;
      }
    } catch (error) {
      meta.moduleAccess = `error: ${String(error).slice(0, 200)}`;
    }
  }
  // Without the editor's own modules nothing below means anything.
  if (!registry) return { fields: {}, ids: {}, meta };

  // ── Classes, from the registry ──
  const SPECS = {
    store: registry.STORE_FIELDS,
    track: registry.TRACK_FIELDS,
    midiClip: registry.MIDI_CLIP_FIELDS,
    audioClip: registry.AUDIO_CLIP_FIELDS,
    region: registry.CHORD_REGION_FIELDS,
    marker: registry.MARKER_FIELDS,
    note: registry.NOTE_EVENT_FIELDS,
    patch: { oracleSynth: registry.ORACLE_PATCH_FIELD },
  };
  const specOf = (source) => {
    const [kind, key] = source.split('.');
    const spec = SPECS[kind]?.[key];
    if (!spec) throw new Error(`fingerprint: no registry entry ${source}`);
    return spec;
  };
  const classOf = (spec) => {
    if (spec.scope === 'session') {
      return spec.group === 'context' ? 'context' : 'session';
    }
    if (spec.scope === 'pref') return 'pref';
    if (spec.perUser) return 'track-local';
    return spec.scope;
  };
  // The registry entries the fields show, for the coverage check below.
  const shown = new Set();

  // ── Reference maps (ids → position tokens) ──
  const trackRef = new Map();
  const clipRef = new Map();
  // `startTick:note` of every note, per clip, and each note's id → token.
  const notesOf = new Map();
  const noteRef = new Map();
  s.tracks.forEach((t, i) => {
    trackRef.set(t.id, `T${i}`);
    t.midiClips.forEach((c, j) => {
      clipRef.set(c.id, `T${i}.M${j}`);
      notesOf.set(
        c.id,
        new Set(c.events.map((e) => `${e.startTick}:${e.note}`)),
      );
      for (const e of c.events) {
        if (e.id)
          noteRef.set(e.id, `T${i}:T${i}.M${j}:${e.startTick}:${e.note}`);
      }
    });
    t.audioClips.forEach((c, j) => clipRef.set(c.id, `T${i}.A${j}`));
  });
  const regionRef = new Map(s.chordRegions.map((r, k) => [r.id, `R${k}`]));
  const outside = new Map();
  // The Master bus's automation lane is no track.
  const ownLanes = new Set(['__master__']);
  const refTrack = (id) =>
    id == null ? null : ownLanes.has(id) ? id : (trackRef.get(id) ?? '?');
  const refClip = (id) => (id == null ? null : (clipRef.get(id) ?? '?'));
  const refRegion = (id) => {
    if (id == null) return null;
    if (regionRef.has(id)) return regionRef.get(id);
    if (!outside.has(id)) outside.set(id, `X${outside.size}`);
    return outside.get(id);
  };
  // Score marks name a note by `trackId:clipId:startTick:note` in memory
  // (scoreParts.ts; startTick from the start of the clip), and only the
  // draft by the note's id (notationCodec, decision D2). A mark reads as its
  // note's token, as dangling when its clip has no such note, and as keyed
  // by id when a load left it so: Score can't find a mark by id, so the
  // student would see it gone.
  const refNote = (key) => {
    const text = String(key);
    if (noteRef.has(text)) return `${noteRef.get(text)} (by note id)`;
    const parts = text.split(':');
    if (parts.length < 4) return '?';
    const [note, start] = [parts.pop(), parts.pop()];
    const [trackId, ...clip] = parts;
    const clipId = clip.join(':');
    const token = `${refTrack(trackId)}:${refClip(clipId)}:${start}:${note}`;
    return notesOf.get(clipId)?.has(`${start}:${note}`)
      ? token
      : `${token} (no such note)`;
  };
  const refPair = (entry, left, right) => {
    const index = String(entry).lastIndexOf('|');
    if (index < 0) return '?';
    return `${left(entry.slice(0, index))}|${right(entry.slice(index + 1))}`;
  };
  const keep = (value) => value;

  // ── Fields ──
  const fields = {};
  /**
   * One field: `sources` are the registry entries it shows ('store.bpm',
   * 'track.volume', …), which must agree on a class. `derived` marks a
   * session key every load works out again; `runtime` a field no registry
   * entry describes (decoded audio).
   */
  const put = (
    key,
    sources,
    value,
    { derived = false, runtime = false } = {},
  ) => {
    let cls = runtime ? 'runtime' : null;
    let cloud = false;
    let resetOnNew = true;
    for (const source of sources) {
      shown.add(source);
      const spec = specOf(source);
      let own = classOf(spec);
      if (derived) {
        if (spec.scope !== 'session') {
          throw new Error(
            `fingerprint: ${key} is derived but ${source} is ${spec.scope}`,
          );
        }
        own = 'derived';
      }
      if (cls !== null && cls !== own) {
        throw new Error(`fingerprint: ${key} mixes classes ${cls} and ${own}`);
      }
      cls = own;
      // A field needs the document if any part of it does.
      if (
        spec.cloud === 'document' ||
        (spec.cloud === 'legacy' && cloud !== 'document')
      ) {
        cloud = spec.cloud;
      }
      resetOnNew &&= spec.resetOnNew;
    }
    if (cls === null)
      throw new Error(`fingerprint: ${key} names no registry entry`);
    fields[key] = { class: cls, cloud, resetOnNew, value: plain(value) };
  };

  put('project.id', ['store.projectId'], s.projectId);
  put('project.name', ['store.projectName'], s.projectName);
  put('project.composer', ['store.composerName'], s.composerName);

  put('transport.bpm', ['store.bpm'], s.bpm);
  put(
    'transport.timeSignature',
    ['store.timeSignatureNumerator', 'store.timeSignatureDenominator'],
    `${s.timeSignatureNumerator}/${s.timeSignatureDenominator}`,
  );
  put('transport.loopRange', ['store.loopStart', 'store.loopEnd'], {
    start: s.loopStart,
    end: s.loopEnd,
  });
  put('transport.loopEnabled', ['store.loopEnabled'], s.loopEnabled);
  put('transport.metronome', ['store.metronomeEnabled'], s.metronomeEnabled);
  put('transport.countInBars', ['store.countInBars'], s.countInBars);
  put('transport.position', ['store.position'], s.position);

  // ── Tracks: every Track field the registry has, but the clip lists ──
  put('tracks.count', ['store.tracks'], s.tracks.length);
  const trackKeys = Object.keys(registry.TRACK_FIELDS).filter(
    (k) => !['id', 'midiClips', 'audioClips'].includes(k),
  );
  const clipKeys = Object.keys(registry.MIDI_CLIP_FIELDS).filter(
    (k) => k !== 'id',
  );
  const audioKeys = Object.keys(registry.AUDIO_CLIP_FIELDS).filter(
    (k) => k !== 'id',
  );
  // Notes in the codec's order, (startTick, note), so a load that sorts
  // them changes nothing here.
  const sortedNotes = (events) =>
    events
      .map((e, i) => [e, i])
      .sort(
        ([a, i], [b, j]) =>
          a.startTick - b.startTick || a.note - b.note || i - j,
      )
      .map(([e]) => e);
  // What the per-track fields below show, whether or not there are tracks;
  // the ids are in `ids`.
  for (const k of ['id', 'midiClips', 'audioClips']) shown.add(`track.${k}`);
  for (const k of trackKeys) {
    // The session-only Guitar/Bass-to-MIDI binding: no save keeps it.
    if (registry.TRACK_FIELDS[k].scope !== 'session') shown.add(`track.${k}`);
  }
  for (const k of ['id', ...clipKeys]) shown.add(`midiClip.${k}`);
  for (const k of ['id', ...audioKeys]) shown.add(`audioClip.${k}`);
  shown.add('note.id');
  s.tracks.forEach((t, i) => {
    const at = (field, sources, value, how) =>
      put(`tracks[${i}].${field}`, sources, value, how);
    for (const k of trackKeys) {
      if (registry.TRACK_FIELDS[k].scope === 'session') continue;
      at(k, [`track.${k}`], t[k]);
    }
    at(
      'samplerSample.bufferLoaded',
      [],
      !t.samplerSample
        ? null
        : Boolean(
            audioBuffers.getAudioBuffer(
              samplerChops.samplerBufferKey(t.samplerSample.sampleId),
            ),
          ),
      { runtime: true },
    );
    if (t.instrument === 'oracle-synth') {
      const snap = synthTrackState.getTrackSynthState(t.id);
      // While the patch's Key/Scale follows the project's key, its root and
      // mode are a copy of the key the project works out (useStoreBridge's
      // follow-project-key mirror), which the harmony fields show. They are
      // left out of the hash, so a key the project lost reads there and
      // never as a change to the patch, and any change that is the patch's
      // own still shows.
      const own = snap?.keyScale?.followProjectKey
        ? {
            ...snap,
            keyScale: { ...snap.keyScale, rootPc: undefined, mode: undefined },
          }
        : snap;
      at(
        'synthPatch',
        ['patch.oracleSynth'],
        snap
          ? {
              presetName: snap.presetName ?? null,
              filter1Cutoff: snap.filters?.[0]?.cutoff ?? null,
              filter1Resonance: snap.filters?.[0]?.resonance ?? null,
              pitchBendRange: snap.pitchBendRange ?? null,
              masterVolume: snap.masterVolume ?? null,
              hash: hash(plain(own)),
            }
          : null,
      );
    }
    at('midiClips.count', ['track.midiClips'], t.midiClips.length);
    t.midiClips.forEach((c, j) => {
      for (const k of clipKeys) {
        const value =
          k === 'events'
            ? {
                count: c.events.length,
                // Without ids (canon drops undefined): ids.notes has them.
                hash: hash(
                  sortedNotes(c.events).map((e) => ({ ...e, id: undefined })),
                ),
              }
            : c[k];
        at(`midiClips[${j}].${k}`, [`midiClip.${k}`], value);
      }
    });
    at('audioClips.count', ['track.audioClips'], t.audioClips.length);
    t.audioClips.forEach((c, j) => {
      // Missing fields read as the registry's default, as a load gives them.
      const ref = {};
      for (const k of audioKeys) {
        const fallback = registry.AUDIO_CLIP_FIELDS[k].default;
        ref[k] = c[k] ?? (typeof fallback === 'function' ? null : fallback);
      }
      at(
        `audioClips[${j}].ref`,
        audioKeys.map((k) => `audioClip.${k}`),
        ref,
      );
      at(
        `audioClips[${j}].bufferLoaded`,
        [],
        Boolean(audioBuffers.getAudioBuffer(c.id)),
        { runtime: true },
      );
    });
  });

  put('harmony.rootNote', ['store.rootNote'], s.rootNote);
  put('harmony.mode', ['store.mode'], s.mode);
  put('harmony.rhythmName', ['store.rhythmName'], s.rhythmName);
  put('harmony.genre', ['store.genre'], s.genre);
  put('harmony.swing', ['store.swing'], s.swing);
  put('harmony.keyLock', ['store.rootLocked'], s.rootLocked);
  put('harmony.keyColour', ['store.rootTrackColor'], s.rootTrackColor, {
    derived: true,
  });
  // Every field of a region but its id, as the registry lists them.
  const regionKeys = Object.keys(registry.CHORD_REGION_FIELDS).filter(
    (k) => k !== 'id',
  );
  for (const k of regionKeys) shown.add(`region.${k}`);
  shown.add('region.id');
  put(
    'harmony.chordRegions',
    ['store.chordRegions'],
    s.chordRegions.map((r) =>
      Object.fromEntries(regionKeys.map((k) => [k, r[k]])),
    ),
  );

  put('prism.progression', ['store.stringSeq', 'store.chordSeq'], {
    stringSeq: s.stringSeq,
    chordSeq: s.chordSeq,
  });
  put('prism.strum', ['store.strumMode', 'store.strumAmount'], {
    mode: s.strumMode,
    amount: s.strumAmount,
  });
  put('prism.tilt', ['store.tiltMode', 'store.tiltAmount'], {
    mode: s.tiltMode,
    amount: s.tiltAmount,
  });
  put('prism.filterPercent', ['store.filterPercent'], s.filterPercent);
  put('prism.chordRecordMode', ['store.chordRecordMode'], s.chordRecordMode);
  put(
    'prism.chordRulerShowNotes',
    ['store.chordRulerShowNotes'],
    s.chordRulerShowNotes,
  );

  const notation = (key, value) =>
    put(`notation.${key}`, [`store.${key}`], value);
  notation('measuresPerLine', s.measuresPerLine);
  notation('measureRowSizes', s.measureRowSizes);
  notation('measureRestMap', s.measureRestMap);
  notation('measureFermatas', s.measureFermatas);
  notation('leadSheetSections', s.leadSheetSections);
  notation('leadSheetRepeats', s.leadSheetRepeats);
  notation('leadSheetChordFormat', s.leadSheetChordFormat);
  notation('leadSheetShowRepeats', s.leadSheetShowRepeats);
  notation('leadSheetShowMelody', s.leadSheetShowMelody);
  put(
    'notation.leadSheetMelodyTrack',
    ['store.leadSheetMelodyTrackId'],
    refTrack(s.leadSheetMelodyTrackId),
  );
  notation('scoreChordTracks', s.scoreChordTracks.map(refTrack));
  notation(
    'scoreChordHidden',
    s.scoreChordHidden.map((entry) => {
      const index = entry.indexOf(':');
      return `${refTrack(entry.slice(0, index))}:${refRegion(entry.slice(index + 1))}`;
    }),
  );
  notation(
    'scoreArticulations',
    s.scoreArticulations.map((e) => refPair(e, refNote, keep)),
  );
  notation(
    'scoreSlurs',
    s.scoreSlurs.map((e) => refPair(e, refNote, refNote)),
  );
  notation(
    'scoreSpellings',
    s.scoreSpellings.map((e) => refPair(e, refNote, keep)),
  );
  notation('scoreSystemBreaks', s.scoreSystemBreaks);
  notation('scorePageBreaks', s.scorePageBreaks);
  notation('scoreSystemRuns', s.scoreSystemRuns);
  notation(
    'scoreTextMarks',
    s.scoreTextMarks.map(({ measureIdx, kind, text }) => ({
      measureIdx,
      kind,
      text,
    })),
  );
  notation('scoreSlashNotes', s.scoreSlashNotes.map(refNote));

  // Every field of a marker but its id, in tick order.
  const markerKeys = Object.keys(registry.MARKER_FIELDS).filter(
    (k) => k !== 'id',
  );
  for (const k of markerKeys) shown.add(`marker.${k}`);
  shown.add('marker.id');
  put(
    'markers',
    ['store.markers'],
    [...s.markers]
      .sort((a, b) => a.tick - b.tick)
      .map((m) => Object.fromEntries(markerKeys.map((k) => [k, m[k]]))),
  );

  put('mixer.masteringFxChain', ['store.masteringFxChain'], s.masteringFxChain);
  put('mixer.masteringEffects', ['store.masteringEffects'], s.masteringEffects);
  put('mixer.masteringBypass', ['store.masteringBypass'], s.masteringBypass);
  put('mixer.masterVolume', ['store.masterVolume'], s.masterVolume);
  put('mixer.masterAutomation', ['store.masterAutomation'], s.masterAutomation);
  put('mixer.returns', ['store.returns'], s.returns);

  put('view.clipColorMode', ['store.clipColorMode'], s.clipColorMode);
  put('view.currentView', ['store.currentView'], s.currentView);
  put('view.libraryOpen', ['store.libraryOpen'], s.libraryOpen);
  put('view.channelStripTab', ['store.channelStripTab'], s.channelStripTab);
  put('view.timelineZoom', ['store.timelineZoom'], s.timelineZoom);
  put(
    'view.timelineScrollLeft',
    ['store.timelineScrollLeft'],
    s.timelineScrollLeft,
  );
  put(
    'view.timelineGrid',
    [
      'store.timelineGridSize',
      'store.timelineSnapEnabled',
      'store.timelineTripletMode',
    ],
    {
      size: s.timelineGridSize,
      snap: s.timelineSnapEnabled,
      triplet: s.timelineTripletMode,
    },
  );
  put('view.activeTool', ['store.activeTool'], s.activeTool);
  put(
    'view.selectedTrack',
    ['store.selectedTrackId'],
    refTrack(s.selectedTrackId),
  );
  put(
    'view.selectedClip',
    ['store.selectedClipId', 'store.selectedClipTrackId'],
    {
      clip: refClip(s.selectedClipId),
      track: refTrack(s.selectedClipTrackId),
    },
  );
  put(
    'view.automationLane',
    ['store.automationOpenTrackId', 'store.automationParamId'],
    {
      track: refTrack(s.automationOpenTrackId),
      param: s.automationParamId,
    },
  );

  put(
    'context.tutorial',
    ['store.activeTutorialId', 'store.tutorialStepIndex'],
    {
      id: s.activeTutorialId,
      step: s.activeTutorialId ? s.tutorialStepIndex : null,
    },
  );
  put('context.practiceSession', ['store.practiceSession'], s.practiceSession);

  // ── Coverage: every key the draft or the prefs keep is shown ──
  const wanted = [
    ...registry.LOCAL_KEYS.map((k) => `store.${k}`),
    ...registry.USER_PREF_KEYS.map((k) => `store.${k}`),
    ...[...registry.TRACK_DOC_FIELDS, ...registry.TRACK_PER_USER_FIELDS].map(
      (k) => `track.${k}`,
    ),
    ...Object.keys(registry.MIDI_CLIP_FIELDS).map((k) => `midiClip.${k}`),
    ...Object.keys(registry.AUDIO_CLIP_FIELDS).map((k) => `audioClip.${k}`),
    ...Object.keys(registry.CHORD_REGION_FIELDS).map((k) => `region.${k}`),
    ...Object.keys(registry.MARKER_FIELDS).map((k) => `marker.${k}`),
    'note.id',
  ];
  meta.coverage.missing = wanted.filter((k) => !shown.has(k));

  // ── Raw ids, for id stability ──
  const regionIds = s.chordRegions.map((r) => r.id);
  const noteIds = s.tracks.flatMap((t) =>
    t.midiClips.flatMap((c) => c.events.map((e) => e.id)),
  );
  const ids = {
    tracks: s.tracks.map((t) => t.id),
    midiClips: s.tracks.map((t) => t.midiClips.map((c) => c.id)),
    audioClips: s.tracks.map((t) => t.audioClips.map((c) => c.id)),
    chordRegions: regionIds,
    markers: [...s.markers].sort((a, b) => a.tick - b.tick).map((m) => m.id),
    // Per track and clip, in the codec's note order.
    notes: s.tracks.map((t) =>
      t.midiClips.map((c) => sortedNotes(c.events).map((e) => e.id ?? null)),
    ),
    chordRegionIdsUnique: new Set(regionIds).size === regionIds.length,
    // Every note has an id, and no two notes in the project share one.
    noteIdsUnique:
      noteIds.every((id) => typeof id === 'string' && id.length > 0) &&
      new Set(noteIds).size === noteIds.length,
  };

  try {
    const raw = localStorage.getItem('musicAtlas:daw:autosave');
    if (raw) {
      const parsed = JSON.parse(raw);
      meta.autosave = {
        version: parsed.version,
        schema: parsed.schema ?? null,
        timestamp: parsed.timestamp,
        bytes: raw.length,
        tracks: parsed.data?.tracks?.length ?? null,
      };
    }
  } catch {
    meta.autosave = { error: 'unreadable' };
  }

  return { fields, ids, meta };
}

/**
 * Runs in the page, after the fingerprint (it edits the chord lane). Writes
 * one chord in the lead sheet past the last region, as a student would, and
 * reports whether its id collides with an existing region's. After a full
 * page load the store's id counter restarted at cr-1 while restored regions
 * kept their ids (state-reload-05, fixed in 1.1).
 */
export function probeChordIdCollision() {
  const store = window.__MA_STORE__;
  const before = store.getState().chordRegions;
  if (before.length === 0) return { regions: 0, newId: null, collides: false };
  const lastEnd = Math.max(...before.map((r) => r.endTick));
  const known = new Set(before.map((r) => r.id));
  store
    .getState()
    .insertChordRegion(lastEnd + 1920, 'Probe', 'Probe', [128, 128, 128]);
  const added = store
    .getState()
    .chordRegions.filter((r) => r.name === 'Probe' && r.startTick > lastEnd);
  const newId = added.at(-1)?.id ?? null;
  return { regions: before.length, newId, collides: known.has(newId) };
}

// ── Node side: comparing snapshots ──────────────────────────────────────────

/** `tracks[3].midiClips[0].ccEvents` → `tracks[].midiClips[].ccEvents`. */
export function aggregateKey(key) {
  return key.replace(/\[\d+\]/g, '[]');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Deep equality on the canonical JSON (key order ignored). */
export function sameValue(a, b) {
  return canonical(a) === canonical(b);
}

function isEmpty(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * The track or clip `key` belongs to, when that whole entity is missing from
 * `side` (a track is there when its `name` is, a MIDI clip by its `name`, an
 * audio clip by its `ref`); null when only the field is.
 */
function entityGone(key, side) {
  const match = /^tracks\[(\d+)\](?:\.(midiClips|audioClips)\[(\d+)\])?/.exec(
    key,
  );
  if (!match) return null;
  const track = `tracks[${match[1]}]`;
  if (!(`${track}.name` in side.fields)) {
    return { key: track, field: 'tracks[] (whole track)' };
  }
  if (!match[2]) return null;
  const clip = `${track}.${match[2]}[${match[3]}]`;
  const anchor = match[2] === 'midiClips' ? 'name' : 'ref';
  return `${clip}.${anchor}` in side.fields
    ? null
    : { key: clip, field: `tracks[].${match[2]}[] (whole clip)` };
}

/**
 * Every field whose value differs between two fingerprints, plus the id
 * kinds whose ids were re-minted. Each difference is
 * `{ key, field, class, cloud, kind, before, after }`, where `field` is the
 * key with indexes dropped (what the ratchet counts) and `kind` is:
 *
 * - `lost`: the field is gone, empty, or back at its default (`defaults` is
 *   a fingerprint of a fresh project, used when given);
 * - `added`: the field exists only afterwards;
 * - `changed`: anything else (a wrong value, a dangling reference).
 *
 * A key whose whole track or clip exists on one side only also carries
 * `entity: { key, field }` (`tracks[3]`, `tracks[] (whole track)`), so a
 * report can count a deleted track once instead of every field in it.
 *
 * `classes` limits the fields compared to those classes (FIELD_CLASSES; all
 * when null), and `resetOnNewOnly` to fields a new project starts over (what
 * a leak check asks). Ids are compared unless `ignore` names them. `ignore`
 * is a list of keys or fields (aggregate keys) left out, for values that
 * legitimately differ between the two snapshots.
 */
export function compareFingerprints(
  before,
  after,
  { classes = null, resetOnNewOnly = false, defaults = null, ignore = [] } = {},
) {
  const skip = new Set(ignore);
  const wanted = classes ? new Set(classes) : null;
  const keys = new Set([
    ...Object.keys(before.fields),
    ...Object.keys(after.fields),
  ]);
  const diffs = [];
  for (const key of [...keys].sort()) {
    const field = aggregateKey(key);
    if (skip.has(key) || skip.has(field)) continue;
    const b = before.fields[key];
    const a = after.fields[key];
    const about = b ?? a;
    if (wanted && !wanted.has(about.class)) continue;
    if (resetOnNewOnly && !about.resetOnNew) continue;
    if (b && a && sameValue(b.value, a.value)) continue;
    let kind = 'changed';
    if (!a) kind = 'lost';
    else if (!b) kind = 'added';
    else if (
      isEmpty(a.value) ||
      (defaults?.fields[key] && sameValue(a.value, defaults.fields[key].value))
    ) {
      kind = 'lost';
    }
    diffs.push({
      key,
      field,
      class: about.class,
      cloud: about.cloud,
      kind,
      before: b ? b.value : undefined,
      after: a ? a.value : undefined,
      entity: !a ? entityGone(key, after) : !b ? entityGone(key, before) : null,
    });
  }
  for (const kind of ID_KINDS) {
    const field = `ids.${kind}`;
    if (skip.has(field)) continue;
    // Snapshots from before a kind existed have none of it.
    const b = (before.ids[kind] ?? []).flat(Infinity);
    const a = (after.ids[kind] ?? []).flat(Infinity);
    // Only when the same number survived: a lost entity is already reported
    // through its fields, and this is about re-minting.
    if (b.length === a.length && !sameValue(b, a)) {
      diffs.push({
        key: field,
        field,
        class: 'ids',
        cloud: false,
        kind: 'changed',
        before: b,
        after: a,
      });
    }
  }
  for (const flag of ID_FLAGS) {
    const field = `ids.${flag}`;
    if (skip.has(field) || !before.ids[flag] || after.ids[flag] !== false) {
      continue;
    }
    diffs.push({
      key: field,
      field,
      class: 'ids',
      cloud: false,
      kind: 'changed',
      before: true,
      after: false,
    });
  }
  return diffs;
}
