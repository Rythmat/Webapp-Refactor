// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { serializeSession, deserializeSession } from '../SessionSerializer';

const s = () => useStore.getState();

function addDrumTrack(): string {
  s().addTrack('midi', 'drum-machine', 'Drums');
  const track = s().tracks[s().tracks.length - 1];
  return track.id;
}

describe('session serialization — drumKit', () => {
  beforeEach(() => {
    useStore.setState({ tracks: [] });
  });

  it('round-trips drumKit through serialize → deserialize', () => {
    const id = addDrumTrack();
    s().setDrumKit(id, '808');

    const session = serializeSession();
    expect(
      session.data.tracks.find((t) => t.id === id)?.settings?.drumKit,
    ).toBe('808');

    // Mutate away, then restore from the snapshot
    s().setDrumKit(id, 'natural');
    deserializeSession(session);
    expect(s().tracks.find((t) => t.id === id)?.drumKit).toBe('808');
  });

  it('round-trips samplerSample through serialize → deserialize', () => {
    s().addTrack('midi', 'sampler', 'Chops');
    const id = s().tracks[s().tracks.length - 1].id;
    const sample = {
      sampleId: 'smp-1',
      assetId: 'asset-1',
      rootNote: 'D4',
      attack: 0.01,
      release: 0.5,
      name: 'vox.wav',
      durationSeconds: 1.2,
    };
    s().setSamplerSample(id, sample);

    const session = serializeSession();
    s().setSamplerSample(id, undefined);
    deserializeSession(session);
    expect(s().tracks.find((t) => t.id === id)?.samplerSample).toEqual(sample);
  });

  it('backfills sampleId for saves written before the field existed', () => {
    s().addTrack('midi', 'sampler', 'Chops');
    const id = s().tracks[s().tracks.length - 1].id;
    s().setSamplerSample(id, {
      sampleId: 'smp-1',
      assetId: 'asset-7',
      rootNote: 'C4',
      attack: 0,
      release: 0.2,
    });
    const legacy = structuredClone(serializeSession());
    for (const t of legacy.data.tracks) {
      if (t.settings?.samplerSample) {
        delete (t.settings.samplerSample as { sampleId?: string }).sampleId;
      }
    }

    deserializeSession(legacy);
    expect(s().tracks.find((t) => t.id === id)?.samplerSample?.sampleId).toBe(
      'legacy-asset-7',
    );
  });

  it('backfills effect slots (multiband) missing from an older save', () => {
    s().addTrack('midi', 'oracle-synth', 'Synth');
    const id = s().tracks[s().tracks.length - 1].id;
    const session = serializeSession();
    // Simulate a save written before the multiband slot existed.
    const legacy = structuredClone(session);
    for (const t of legacy.data.tracks) {
      if (t.settings?.effects) {
        delete (t.settings.effects as unknown as Record<string, unknown>)
          .multiband;
      }
    }
    deserializeSession(legacy);
    const restored = s().tracks.find((t) => t.id === id);
    // Backfilled from DEFAULT_EFFECTS — not undefined (which would crash the
    // EffectChain and the OTT lesson check).
    expect(restored?.effects.multiband).toBeDefined();
    expect(restored?.effects.multiband.enabled).toBe(false);
    expect(restored?.effects.multiband.depth).toBe(0.3);
    // Existing slots are preserved, not reset.
    expect(restored?.effects.compressor).toBeDefined();
  });

  it('loads old saves without a drumKit as undefined (→ natural)', () => {
    const id = addDrumTrack();
    const session = serializeSession();
    const legacy = structuredClone(session);
    for (const t of legacy.data.tracks) delete t.settings?.drumKit;

    deserializeSession(legacy);
    expect(s().tracks.find((t) => t.id === id)?.drumKit).toBeUndefined();
  });
});

describe('session serialization — sends & returns', () => {
  beforeEach(() => {
    useStore.setState({ tracks: [] });
  });

  it('round-trips per-track aux sends', () => {
    const id = addDrumTrack();
    s().setSend(id, 'A', 0.5);
    s().setSend(id, 'B', 0.2);

    const session = serializeSession();
    expect(
      session.data.tracks.find((t) => t.id === id)?.settings?.sends,
    ).toEqual({ A: 0.5, B: 0.2 });

    s().setSend(id, 'A', 0);
    deserializeSession(session);
    expect(s().tracks.find((t) => t.id === id)?.sends).toEqual({
      A: 0.5,
      B: 0.2,
    });
  });

  it('round-trips return definitions (FX tweaks survive)', () => {
    addDrumTrack();
    // Tweak Return A's reverb wet
    const cur = s().returns.find((r) => r.id === 'A')!;
    s().updateReturnEffects('A', {
      reverb: { ...cur.effects.reverb, decay: 4.2 },
    });
    const session = serializeSession();

    // Mutate away, then restore
    s().updateReturnEffects('A', {
      reverb: { ...cur.effects.reverb, decay: 1 },
    });
    deserializeSession(session);
    expect(s().returns.find((r) => r.id === 'A')?.effects.reverb.decay).toBe(
      4.2,
    );
  });

  it('falls back to default returns when a save predates the feature', () => {
    addDrumTrack();
    const session = serializeSession();
    const legacy = structuredClone(session);
    delete legacy.data.returns;

    deserializeSession(legacy);
    const returns = s().returns;
    expect(returns.map((r) => r.id)).toEqual(['A', 'B']);
    expect(returns[0].effects.reverb.enabled).toBe(true);
    expect(returns[1].effects.delay.enabled).toBe(true);
  });

  it('preserves a valid ducker keyTrackId across a local reload (ids stable)', () => {
    s().addTrack('midi', 'drum-machine', 'Drums');
    const drumId = s().tracks[s().tracks.length - 1].id;
    s().addTrack('midi', 'oracle-synth', 'Bass');
    const bassId = s().tracks[s().tracks.length - 1].id;
    s().updateTrackEffects(bassId, {
      ducker: {
        ...s().tracks.find((t) => t.id === bassId)!.effects.ducker,
        enabled: true,
        keyTrackId: drumId,
      },
    });

    const session = serializeSession();
    deserializeSession(session);
    // Local load keeps ids, so the key still resolves to the drum track.
    const bass = s().tracks.find((t) => t.name === 'Bass');
    const drum = s().tracks.find((t) => t.name === 'Drums');
    expect(bass?.effects.ducker.keyTrackId).toBe(drum?.id);
  });

  it('nulls a ducker keyTrackId pointing at a deleted track', () => {
    s().addTrack('midi', 'oracle-synth', 'Bass');
    const bassId = s().tracks[s().tracks.length - 1].id;
    s().updateTrackEffects(bassId, {
      ducker: {
        ...s().tracks.find((t) => t.id === bassId)!.effects.ducker,
        enabled: true,
        keyTrackId: 'ghost-track-id',
      },
    });
    const session = serializeSession();
    deserializeSession(session);
    // The key points at a track that isn't in the project → nulled (fail silent).
    expect(
      s().tracks.find((t) => t.name === 'Bass')?.effects.ducker.keyTrackId,
    ).toBeNull();
  });

  it('backfills effect slots missing from a saved return', () => {
    addDrumTrack();
    const session = serializeSession();
    const legacy = structuredClone(session);
    for (const r of legacy.data.returns ?? []) {
      delete (r.effects as unknown as Record<string, unknown>).multiband;
    }
    deserializeSession(legacy);
    // multiband backfilled from DEFAULT_EFFECTS, not undefined
    expect(s().returns[0].effects.multiband).toBeDefined();
  });
});

describe('session serialization — automation', () => {
  beforeEach(() => {
    useStore.setState({ tracks: [] });
  });

  it('round-trips automation lanes through serialize → deserialize', () => {
    const id = addDrumTrack();
    s().upsertAutomationPoint(id, 'volume', { tick: 0, value: 1 });
    s().upsertAutomationPoint(id, 'volume', { tick: 480, value: 0.2 });
    s().upsertAutomationPoint(id, 'pan', { tick: 0, value: -1 });

    const session = serializeSession();
    expect(
      session.data.tracks.find((t) => t.id === id)?.settings?.automation,
    ).toEqual({
      volume: [
        { tick: 0, value: 1 },
        { tick: 480, value: 0.2 },
      ],
      pan: [{ tick: 0, value: -1 }],
    });

    // Mutate away, then restore
    s().clearAutomationLane(id, 'volume');
    deserializeSession(session);
    const t = s().tracks.find((tr) => tr.id === id);
    expect(t?.automation?.volume).toHaveLength(2);
    expect(t?.automation?.pan?.[0]).toEqual({ tick: 0, value: -1 });
  });

  it('loads a save without automation as undefined', () => {
    addDrumTrack();
    const session = serializeSession();
    deserializeSession(session);
    expect(s().tracks[0].automation).toBeUndefined();
  });
});
