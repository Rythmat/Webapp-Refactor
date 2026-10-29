import type { RegionId, SelectedLocation } from '@/components/atlas/types';

/**
 * The places music travels between: the influence links between events
 * (data/eventConnections.ts) rolled up by where the events happened.
 */

/** How finely places are told apart. */
export type PlaceLevel = 'city' | 'country' | 'region';

/** `city:new-orleans`, `country:US` (normCountry's key), `region:west-africa`. */
export type PlaceNodeId = string;

export interface PlaceNode {
  id: PlaceNodeId;
  level: PlaceLevel;
  label: string;
  lat: number;
  lng: number;
  regionId: RegionId;
  /** The stop a click opens; a region opens none. */
  place: SelectedLocation | null;
}

/** Influences from one place to another (never a place to itself). */
export interface PlaceLink {
  /** `${from}>${to}`, stable across windows. */
  id: string;
  from: PlaceNodeId;
  to: PlaceNodeId;
  /** How many event-to-event influences it carries. */
  weight: number;
  /** The years they arrived (the later events'), first and last. */
  years: readonly [number, number];
  /** A few of them, earliest first: [influencer, influenced] event ids. */
  sample: readonly (readonly [string, string])[];
}

/** A stop's links: what reached it from elsewhere, and what it reached. */
export interface ScopeLinks {
  /** Came from: far place → the stop's place. */
  roots: PlaceLink[];
  /** Went to: the stop's place → far place. */
  routes: PlaceLink[];
  /** Influences that stayed within the stop's own places. */
  local: number;
  /** roots' + routes' weights + local. */
  total: number;
}

export interface NodeMetrics {
  events: number;
  /** Influences arriving from other places. */
  inLinks: number;
  /** Influences reaching other places. */
  outLinks: number;
  /** Influences within the place itself. */
  localLinks: number;
}
