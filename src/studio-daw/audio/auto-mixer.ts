import type { Track } from '@/studio-daw/hooks/use-audio-engine';
import type { TrackEffect } from './effect-chain';

type TrackRole = 'drums' | 'bass' | 'vocals' | 'lead' | 'pad' | 'other';

export interface MixSuggestion {
  trackId: string;
  volume: number;
  pan: number;
  eqEffects: TrackEffect[];
}

export interface AutoMixResult {
  suggestions: MixSuggestion[];
  summary: string;
}

const ROLE_VOLUMES: Record<TrackRole, number> = {
  drums: 0.85,
  bass: 0.80,
  vocals: 0.90,
  lead: 0.75,
  pad: 0.50,
  other: 0.65,
};

const ROLE_PAN_SLOTS: Record<TrackRole, number[]> = {
  drums: [0],
  bass: [0],
  vocals: [0],
  lead: [-0.15, 0.15],
  pad: [-0.4, 0.4],
  other: [-0.3, 0.3, -0.5, 0.5],
};

function generateId(): string {
  return 'automix-' + Math.random().toString(36).substr(2, 9);
}

function classifyTrackRole(track: Track): TrackRole {
  const name = track.name.toLowerCase();
  const role = track.clips[0]?.role?.toLowerCase();

  if (name.includes('drum') || name.includes('percussion') || role === 'rhythmic') return 'drums';
  if (name.includes('bass') || role === 'foundation') return 'bass';
  if (name.includes('vocal') || name.includes('voice') || name.includes('sing')) return 'vocals';
  if (name.includes('pad') || name.includes('ambient') || name.includes('atmosphere') || role === 'atmosphere') return 'pad';
  if (name.includes('lead') || name.includes('melody') || name.includes('solo') || role === 'melodic') return 'lead';

  // Fall back to analysis
  const analysis = track.clips[0]?.analysis;
  if (analysis) {
    if (analysis.isPercussive) return 'drums';
    if (analysis.spectralCentroid < 0.25) return 'bass';
    if (analysis.spectralCentroid > 0.65) return 'lead';
  }

  return 'other';
}

function getEQForRole(role: TrackRole): TrackEffect[] {
  const effects: TrackEffect[] = [];

  // High-pass on everything except bass and drums
  if (role !== 'bass' && role !== 'drums') {
    effects.push({
      id: generateId(),
      type: 'eq',
      enabled: true,
      params: { wet: 1.0, eqType: 'highpass', eqFrequency: 80, eqGain: 0, eqQ: 0.7 },
    });
  }

  // Low-pass on pads to tame harshness
  if (role === 'pad') {
    effects.push({
      id: generateId(),
      type: 'eq',
      enabled: true,
      params: { wet: 1.0, eqType: 'lowpass', eqFrequency: 8000, eqGain: 0, eqQ: 0.7 },
    });
  }

  // Presence boost on vocals
  if (role === 'vocals') {
    effects.push({
      id: generateId(),
      type: 'eq',
      enabled: true,
      params: { wet: 1.0, eqType: 'peaking', eqFrequency: 3000, eqGain: 2, eqQ: 1.5 },
    });
  }

  return effects;
}

export function generateAutoMix(tracks: Track[]): AutoMixResult {
  // Track role counts for pan distribution
  const roleCounts: Record<TrackRole, number> = { drums: 0, bass: 0, vocals: 0, lead: 0, pad: 0, other: 0 };

  const suggestions: MixSuggestion[] = tracks.map(track => {
    const role = classifyTrackRole(track);
    const panSlots = ROLE_PAN_SLOTS[role];
    const panIndex = roleCounts[role] % panSlots.length;
    roleCounts[role]++;

    return {
      trackId: track.id,
      volume: ROLE_VOLUMES[role],
      pan: panSlots[panIndex],
      eqEffects: getEQForRole(role),
    };
  });

  const roles = tracks.map(t => classifyTrackRole(t));
  const uniqueRoles = [...new Set(roles)];
  const summary = `Balanced ${tracks.length} tracks (${uniqueRoles.join(', ')})`;

  return { suggestions, summary };
}
