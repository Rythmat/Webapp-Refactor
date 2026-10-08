/* eslint-env node */
/**
 * The fingerprint for the reload round-trip suite (roundtrip.mjs): a
 * normalised snapshot of exactly the fields the kitchen sink sets
 * (kitchenSink.mjs), so two snapshots taken around a reload, a SPA return, a
 * cloud save and reopen, or a boot can be compared field by field.
 *
 *   const before = await page.evaluate(fingerprintPage);
 *   ...
 *   const diffs = compareFingerprints(before, after);
 *
 * Normalisation. A cloud load re-mints track and audio-clip ids, chord-region
 * ids restart their counter on every page load, and marker ids are not saved
 * at all, so values never carry raw ids: every reference is rewritten to a
 * position token (track `T2`, MIDI clip
 * `T2.M0`, audio clip `T2.A0`, chord region `R1`; an id that resolves to
 * nothing becomes `?`, an id outside the lane `X0`). A Score mark on note
 * `trackId:clipId:480:62` reads `T0:T0.M0:480:62`, so marks that survive with
 * dangling ids still show as wrong. Raw ids are kept apart in `ids`, which
 * compareFingerprints checks as id stability (re-minted ids) on their own.
 *
 * Each field carries the group the audit's proposal would give it (areas.md,
 * state-reload, PROPOSAL 2): `doc` (persisted and undoable), `prefs` (per
 * user: input routing, loop, metronome, count-in), `session` (playhead,
 * arm/monitor), `view` (view, zoom, selection, panels) and `context` (lesson
 * and practice, plan 1.15). Groups only label the report; every field counts.
 *
 * fingerprintPage runs in the editor page and must be self-contained.
 * The Oracle Synth patch cache, the decoded-audio store and the sampler
 * helpers have no window handle, so it imports their modules from the dev
 * server; `meta.moduleAccess` says whether those imports are the editor's
 * own instances (if not, the module-backed fields read `unknown`).
 */

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
  // Module URLs on the dev server: the browser resolves them, not node.
  const devModule = (url) => import(url);
  let moduleAccess = 'ok';
  let synthTrackState = null;
  let audioBuffers = null;
  let samplerChops = null;
  try {
    const [storeModule, synthModule, sts, abs, chops] = await Promise.all([
      devModule('/src/daw/store/index.ts'),
      devModule('/src/daw/oracle-synth/store/index.ts'),
      devModule('/src/daw/oracle-synth/synthTrackState.ts'),
      devModule('/src/daw/audio/AudioBufferStore.ts'),
      devModule('/src/daw/instruments/samplerChops.ts'),
    ]);
    if (
      storeModule.useStore !== store ||
      synthModule.useSynthStore !== window.__MA_SYNTH_STORE__
    ) {
      moduleAccess = 'mismatch';
    } else {
      synthTrackState = sts;
      audioBuffers = abs;
      samplerChops = chops;
    }
  } catch (error) {
    moduleAccess = `error: ${String(error).slice(0, 200)}`;
  }

  // ── Reference maps (ids → position tokens) ──
  const trackRef = new Map();
  const clipRef = new Map();
  s.tracks.forEach((t, i) => {
    trackRef.set(t.id, `T${i}`);
    t.midiClips.forEach((c, j) => clipRef.set(c.id, `T${i}.M${j}`));
    t.audioClips.forEach((c, j) => clipRef.set(c.id, `T${i}.A${j}`));
  });
  const regionRef = new Map(s.chordRegions.map((r, k) => [r.id, `R${k}`]));
  const outside = new Map();
  const refTrack = (id) => (id == null ? null : (trackRef.get(id) ?? '?'));
  const refClip = (id) => (id == null ? null : (clipRef.get(id) ?? '?'));
  const refRegion = (id) => {
    if (id == null) return null;
    if (regionRef.has(id)) return regionRef.get(id);
    if (!outside.has(id)) outside.set(id, `X${outside.size}`);
    return outside.get(id);
  };
  // Score note ids are `trackId:clipId:startTick:note` (scoreParts.ts).
  const refNote = (noteId) => {
    const parts = String(noteId).split(':');
    if (parts.length < 4) return '?';
    const [note, start] = [parts.pop(), parts.pop()];
    const [trackId, ...clip] = parts;
    return `${refTrack(trackId)}:${refClip(clip.join(':'))}:${start}:${note}`;
  };
  const refPair = (entry, left, right) => {
    const index = String(entry).lastIndexOf('|');
    if (index < 0) return '?';
    return `${left(entry.slice(0, index))}|${right(entry.slice(index + 1))}`;
  };
  const keep = (value) => value;

  // ── Fields ──
  const fields = {};
  const put = (key, group, value) => {
    fields[key] = { group, value: plain(value) };
  };

  put('project.id', 'doc', s.projectId);
  put('project.name', 'doc', s.projectName);
  put('project.composer', 'doc', s.composerName);

  put('transport.bpm', 'doc', s.bpm);
  put(
    'transport.timeSignature',
    'doc',
    `${s.timeSignatureNumerator}/${s.timeSignatureDenominator}`,
  );
  put('transport.loop', 'prefs', {
    enabled: s.loopEnabled,
    start: s.loopStart,
    end: s.loopEnd,
  });
  put('transport.metronome', 'prefs', s.metronomeEnabled);
  put('transport.countInBars', 'prefs', s.countInBars);
  put('transport.position', 'session', s.position);

  put('tracks.count', 'doc', s.tracks.length);
  const unknown = 'unknown';
  s.tracks.forEach((t, i) => {
    const at = (field, group, value) =>
      put(`tracks[${i}].${field}`, group, value);
    at('name', 'doc', t.name);
    at('type', 'doc', t.type);
    at('instrument', 'doc', t.instrument);
    at('color', 'doc', t.color);
    at('volume', 'doc', t.volume);
    at('pan', 'doc', t.pan);
    at('mute', 'doc', t.mute);
    at('solo', 'doc', t.solo);
    at('recordArmed', 'session', t.recordArmed);
    at('monitoring', 'session', t.monitoring);
    at('midiInputId', 'prefs', t.midiInputId);
    at('audioInputId', 'prefs', t.audioInputId);
    at('audioInputChannel', 'prefs', t.audioInputChannel);
    at('trackRole', 'doc', t.trackRole);
    at('gmProgram', 'doc', t.gmProgram);
    at('presetName', 'doc', t.presetName);
    at('drumKit', 'doc', t.drumKit);
    at('drumPads', 'doc', t.drumPads);
    at('bassVoice', 'doc', t.bassVoice);
    at('organState', 'doc', t.organState);
    at('samplerSample', 'doc', t.samplerSample);
    at(
      'samplerSample.bufferLoaded',
      'doc',
      !t.samplerSample
        ? null
        : samplerChops && audioBuffers
          ? Boolean(
              audioBuffers.getAudioBuffer(
                samplerChops.samplerBufferKey(t.samplerSample.sampleId),
              ),
            )
          : unknown,
    );
    at('vocalChain', 'doc', t.vocalChain);
    at('guitarChain', 'doc', t.guitarChain);
    at('effects', 'doc', t.effects);
    at('activeEffects', 'doc', t.activeEffects);
    at('sends', 'doc', t.sends);
    at('automation', 'doc', t.automation);
    if (t.instrument === 'oracle-synth') {
      let patch = unknown;
      if (synthTrackState) {
        const snap = synthTrackState.getTrackSynthState(t.id);
        patch = snap
          ? {
              presetName: snap.presetName ?? null,
              filter1Cutoff: snap.filters?.[0]?.cutoff ?? null,
              filter1Resonance: snap.filters?.[0]?.resonance ?? null,
              pitchBendRange: snap.pitchBendRange ?? null,
              masterVolume: snap.masterVolume ?? null,
              hash: hash(plain(snap)),
            }
          : null;
      }
      at('synthPatch', 'doc', patch);
    }
    at('midiClips.count', 'doc', t.midiClips.length);
    t.midiClips.forEach((c, j) => {
      const clip = (field, value) =>
        at(`midiClips[${j}].${field}`, 'doc', value);
      clip('name', c.name);
      clip('startTick', c.startTick);
      clip('durationTicks', c.durationTicks);
      clip('events', { count: c.events.length, hash: hash(c.events) });
      clip('ccEvents', c.ccEvents);
    });
    at('audioClips.count', 'doc', t.audioClips.length);
    t.audioClips.forEach((c, j) => {
      const clip = (field, value) =>
        at(`audioClips[${j}].${field}`, 'doc', value);
      clip('ref', {
        assetId: c.assetId ?? null,
        startTick: c.startTick,
        duration: c.duration,
        fadeInTicks: c.fadeInTicks ?? 0,
        fadeOutTicks: c.fadeOutTicks ?? 0,
        offsetSeconds: c.offsetSeconds ?? 0,
        gain: c.gain ?? 1,
      });
      clip(
        'bufferLoaded',
        audioBuffers ? Boolean(audioBuffers.getAudioBuffer(c.id)) : unknown,
      );
      const pitch = s.pitchData?.[c.id];
      clip(
        'pitchEdits',
        pitch ? { segments: pitch.segments.length, edits: pitch.edits } : null,
      );
    });
  });

  put('harmony.rootNote', 'doc', s.rootNote);
  put('harmony.mode', 'doc', s.mode);
  put('harmony.rhythmName', 'doc', s.rhythmName);
  put('harmony.genre', 'doc', s.genre);
  put('harmony.swing', 'doc', s.swing);
  put('harmony.keyLock', 'doc', s.rootLocked);
  put('harmony.keyColour', 'doc', s.rootTrackColor);
  put(
    'harmony.chordRegions',
    'doc',
    s.chordRegions.map((r) => ({
      startTick: r.startTick,
      endTick: r.endTick,
      rawStartTick: r.rawStartTick,
      name: r.name,
      noteName: r.noteName,
      color: r.color,
      degreeKey: r.degreeKey,
      midis: r.midis,
      confidence: r.confidence,
    })),
  );
  put('prism.progression', 'doc', {
    stringSeq: s.stringSeq,
    chordSeq: s.chordSeq,
  });
  put('prism.strum', 'doc', { mode: s.strumMode, amount: s.strumAmount });
  put('prism.tilt', 'doc', { mode: s.tiltMode, amount: s.tiltAmount });
  put('prism.filterPercent', 'doc', s.filterPercent);
  put('prism.chordRecordMode', 'doc', s.chordRecordMode);
  put('prism.chordRulerShowNotes', 'doc', s.chordRulerShowNotes);

  put('notation.measuresPerLine', 'doc', s.measuresPerLine);
  put('notation.measureRowSizes', 'doc', s.measureRowSizes);
  put('notation.measureRestMap', 'doc', s.measureRestMap);
  put('notation.measureFermatas', 'doc', s.measureFermatas);
  put('notation.melodyOverrides', 'doc', s.melodyOverrides.map(refRegion));
  put('notation.leadSheetSections', 'doc', s.leadSheetSections);
  put('notation.leadSheetRepeats', 'doc', s.leadSheetRepeats);
  put('notation.leadSheetChordFormat', 'doc', s.leadSheetChordFormat);
  put('notation.leadSheetShowRepeats', 'doc', s.leadSheetShowRepeats);
  put('notation.leadSheetShowMelody', 'doc', s.leadSheetShowMelody);
  put(
    'notation.leadSheetMelodyTrack',
    'doc',
    refTrack(s.leadSheetMelodyTrackId),
  );
  put('notation.scoreChordTracks', 'doc', s.scoreChordTracks.map(refTrack));
  put(
    'notation.scoreChordHidden',
    'doc',
    s.scoreChordHidden.map((entry) => {
      const index = entry.indexOf(':');
      return `${refTrack(entry.slice(0, index))}:${refRegion(entry.slice(index + 1))}`;
    }),
  );
  put(
    'notation.scoreArticulations',
    'doc',
    s.scoreArticulations.map((e) => refPair(e, refNote, keep)),
  );
  put(
    'notation.scoreSlurs',
    'doc',
    s.scoreSlurs.map((e) => refPair(e, refNote, refNote)),
  );
  put(
    'notation.scoreSpellings',
    'doc',
    s.scoreSpellings.map((e) => refPair(e, refNote, keep)),
  );
  put('notation.scoreSystemBreaks', 'doc', s.scoreSystemBreaks);
  put('notation.scorePageBreaks', 'doc', s.scorePageBreaks);
  put('notation.scoreSystemRuns', 'doc', s.scoreSystemRuns);
  put(
    'notation.scoreTextMarks',
    'doc',
    s.scoreTextMarks.map(({ measureIdx, kind, text }) => ({
      measureIdx,
      kind,
      text,
    })),
  );
  put('notation.scoreSlashNotes', 'doc', s.scoreSlashNotes.map(refNote));

  put(
    'markers',
    'doc',
    [...s.markers]
      .sort((a, b) => a.tick - b.tick)
      .map(({ tick, name, color }) => ({ tick, name, color })),
  );

  put('mixer.masteringStyle', 'doc', s.masteringStyle);
  put('mixer.masteringEq', 'doc', s.masteringEq);
  put('mixer.masteringPresence', 'doc', s.masteringPresence);
  put('mixer.masteringDeEsser', 'doc', s.masteringDeEsser);
  put('mixer.masteringLoudness', 'doc', s.masteringLoudness);
  put('mixer.masteringStereoField', 'doc', s.masteringStereoField);
  put('mixer.masteringDynamics', 'doc', s.masteringDynamics);
  put('mixer.masteringAmount', 'doc', s.masteringAmount);
  put('mixer.masteringFxChain', 'doc', s.masteringFxChain);
  put('mixer.masteringEffects', 'doc', s.masteringEffects);
  put('mixer.masteringBypass', 'doc', s.masteringBypass);
  put('mixer.masterVolume', 'doc', s.masterVolume);
  put('mixer.masterAutomation', 'doc', s.masterAutomation);
  put('mixer.returns', 'doc', s.returns);

  // The plan makes clipColorMode a project field (plan.md, integration rules).
  put('view.clipColorMode', 'doc', s.clipColorMode);
  put('view.currentView', 'view', s.currentView);
  put('view.libraryOpen', 'view', s.libraryOpen);
  put('view.channelStripTab', 'view', s.channelStripTab);
  put('view.timelineZoom', 'view', s.timelineZoom);
  put('view.timelineScrollLeft', 'view', s.timelineScrollLeft);
  put('view.timelineGrid', 'view', {
    size: s.timelineGridSize,
    snap: s.timelineSnapEnabled,
    triplet: s.timelineTripletMode,
  });
  put('view.activeTool', 'view', s.activeTool);
  put('view.selectedTrack', 'view', refTrack(s.selectedTrackId));
  put('view.selectedClip', 'view', {
    clip: refClip(s.selectedClipId),
    track: refTrack(s.selectedClipTrackId),
  });
  put('view.automationLane', 'view', {
    track: refTrack(s.automationOpenTrackId),
    param: s.automationParamId,
  });

  put('context.tutorial', 'context', {
    id: s.activeTutorialId,
    step: s.activeTutorialId ? s.tutorialStepIndex : null,
  });
  put('context.practiceSession', 'context', s.practiceSession);

  // ── Raw ids, for id stability ──
  const regionIds = s.chordRegions.map((r) => r.id);
  const ids = {
    tracks: s.tracks.map((t) => t.id),
    midiClips: s.tracks.map((t) => t.midiClips.map((c) => c.id)),
    audioClips: s.tracks.map((t) => t.audioClips.map((c) => c.id)),
    chordRegions: regionIds,
    chordRegionIdsUnique: new Set(regionIds).size === regionIds.length,
    markers: s.markers.map((m) => m.id),
  };

  let autosave = null;
  try {
    const raw = localStorage.getItem('musicAtlas:daw:autosave');
    if (raw) {
      const parsed = JSON.parse(raw);
      autosave = {
        version: parsed.version,
        timestamp: parsed.timestamp,
        bytes: raw.length,
        tracks: parsed.data?.tracks?.length ?? null,
      };
    }
  } catch {
    autosave = { error: 'unreadable' };
  }

  return {
    fields,
    ids,
    meta: {
      path: location.pathname + location.search,
      takenAt: Date.now(),
      isPlaying: s.isPlaying,
      moduleAccess,
      autosave,
    },
  };
}

/**
 * Runs in the page, after the fingerprint (it edits the chord lane). Writes
 * one chord in the lead sheet past the last region, as a student would, and
 * reports whether its id collides with an existing region's. After a full
 * page load the store's id counter restarts at cr-1 while restored regions
 * keep their ids (state-reload-05).
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
 * `{ key, field, group, kind, before, after }`, where `field` is the key
 * with indexes dropped (what the ratchet counts) and `kind` is:
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
 * `ignore` is a list of keys or fields (aggregate keys) left out, for values
 * that legitimately differ between the two snapshots.
 */
export function compareFingerprints(
  before,
  after,
  { defaults = null, ignore = [] } = {},
) {
  const skip = new Set(ignore);
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
    if (b && a && sameValue(b.value, a.value)) continue;
    const group = (b ?? a).group;
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
      group,
      kind,
      before: b ? b.value : undefined,
      after: a ? a.value : undefined,
      entity: !a ? entityGone(key, after) : !b ? entityGone(key, before) : null,
    });
  }
  for (const kind of ['tracks', 'midiClips', 'audioClips', 'chordRegions']) {
    const field = `ids.${kind}`;
    if (skip.has(field)) continue;
    const b = before.ids[kind].flat();
    const a = after.ids[kind].flat();
    // Only when the same number survived: a lost entity is already reported
    // through its fields, and this is about re-minting.
    if (b.length === a.length && !sameValue(b, a)) {
      diffs.push({
        key: field,
        field,
        group: 'ids',
        kind: 'changed',
        before: b,
        after: a,
      });
    }
  }
  if (
    !skip.has('ids.chordRegionIdsUnique') &&
    before.ids.chordRegionIdsUnique &&
    !after.ids.chordRegionIdsUnique
  ) {
    diffs.push({
      key: 'ids.chordRegionIdsUnique',
      field: 'ids.chordRegionIdsUnique',
      group: 'ids',
      kind: 'changed',
      before: true,
      after: false,
    });
  }
  return diffs;
}
