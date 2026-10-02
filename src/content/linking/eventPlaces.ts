import type { GlobeEventInput } from '../graph/deriveGraph';
import { createPlaceBook, type PlaceBook, SAME_PLACE_KM } from './placeBook';
import {
  appSource,
  createCollector,
  firstOfEach,
  isHandAuthored,
  makeSuggestion,
} from './plan';
import {
  CONFIDENCE,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Event places: where each hand-authored event happened, from the city it
 * names (`location.city`), offered as its stored `placeId`.
 *
 * `sure` when the city registry places the name — alone, or, for a name it
 * shares ("Portland", "Charleston"), together with the event's own pin, which
 * sits on one of them. `likely` when the name is registered but the pin is
 * far from it (more than 25 km: a person checks which is wrong), and when
 * the city is none of ours: then accepting first makes it, as a place that
 * is not a pin, at the event's coordinates (`requires`). A `placeId` never
 * moves a pin; the event keeps its `location`.
 *
 * Song events are skipped: theirs is the song's recording place, which the
 * server copies from the song.
 */

export interface EventPlacesReport {
  /** Hand-authored events read. */
  events: number;
  /** Events with no city written. */
  noCity: number;
  /** Placed by the registry's name lookup, the pin within 25 km. */
  byName: number;
  /** A shared registered name, settled by the event's pin. */
  byCoordinates: number;
  /** Placed by name, but the pin is further than 25 km away (`likely`). */
  far: { event: string; city: string; placeId: string; km: number }[];
  /** Events whose city is none of ours, and the new places they ask for. */
  toCreate: { events: number; places: number };
  /** Every event the registry does not place, and what becomes of it. */
  unresolved: {
    event: string;
    city: string;
    country: string;
    /** The place to create, or null when it cannot be made (`reason`). */
    placeId: string | null;
    reason?: string;
  }[];
  sure: number;
  likely: number;
  unreachable: { id: string; reason: string }[];
}

export interface EventPlacesOptions extends PlanOptions {
  /**
   * A place book shared with the other planners that make places, so one
   * new place asked for twice is made once. When one is passed, the caller
   * runs the planners twice and keeps the second answers (`placeBook.ts`);
   * without one, this does so itself.
   */
  book?: PlaceBook;
}

const km = (n: number) => `${Math.round(n)} km`;

function plan(
  input: LinkingInput,
  options: PlanOptions,
  book: PlaceBook,
): Plan<EventPlacesReport> {
  const out = createCollector();
  const report: EventPlacesReport = {
    events: 0,
    noCity: 0,
    byName: 0,
    byCoordinates: 0,
    far: [],
    toCreate: { events: 0, places: 0 },
    unresolved: [],
    sure: 0,
    likely: 0,
    unreachable: out.unreachable,
  };
  const created = new Set<string>();

  for (const event of firstOfEach(input.events, (e) => e?.id)) {
    if (!isHandAuthored(event.id)) continue;
    report.events++;
    const location: NonNullable<GlobeEventInput['location']> =
      event.location ?? {};
    const city = typeof location.city === 'string' ? location.city.trim() : '';
    const country =
      typeof location.country === 'string' ? location.country.trim() : '';
    if (!city) {
      report.noCity++;
      continue;
    }
    const at =
      Number.isFinite(location.lat) && Number.isFinite(location.lng)
        ? ([location.lat, location.lng] as [number, number])
        : undefined;
    const answer = book.place({
      name: city,
      country,
      ...(at ? { coordinates: at } : {}),
      by: event.id,
    });
    const written = `location.city "${city}"${country ? ` (${country})` : ''}`;
    const base = {
      target: { kind: 'globe_event', slug: event.id },
      path: 'placeId',
      op: 'set' as const,
      sources: [appSource(`${event.id} location.city`)],
    };

    if (answer.kind === 'none') {
      report.unresolved.push({
        event: event.id,
        city,
        country,
        placeId: null,
        reason: answer.reason,
      });
      continue;
    }

    if (answer.kind === 'create') {
      report.toCreate.events++;
      created.add(answer.placeId);
      report.unresolved.push({
        event: event.id,
        city,
        country,
        placeId: answer.placeId,
      });
      const [lat, lng] = answer.record.body.coordinates;
      out.add(
        makeSuggestion(
          {
            ...base,
            value: answer.placeId,
            display: `Took place in ${answer.name} (a new place)`,
            evidence: [
              `${written} is none of our places: accepting makes it, not as a pin on the globe, at the event's coordinates (${lat}, ${lng})`,
              ...(answer.regionFrom
                ? [
                    `its globe region is the nearest city's in ${answer.record.body.country}, ${answer.regionFrom}: a person checks`,
                  ]
                : []),
            ],
            confidence: CONFIDENCE.create,
            tier: 'likely',
            requires: [answer.record],
          },
          options,
        ),
        event,
      );
      report.likely++;
      continue;
    }

    const far = answer.km !== undefined && answer.km > SAME_PLACE_KM;
    const evidence =
      answer.how === 'coordinates'
        ? [
            `${written} is our ${answer.name} (${answer.placeId}): the name alone does not say so, and the event's pin, ${km(answer.km ?? 0)} from it, does`,
          ]
        : [
            `${written} is our ${answer.name}`,
            ...(far
              ? [
                  `but the event's pin is ${km(answer.km!)} from it: a person checks which is wrong`,
                ]
              : []),
          ];
    if (far)
      report.far.push({
        event: event.id,
        city,
        placeId: answer.placeId,
        km: Math.round(answer.km!),
      });
    else if (answer.how === 'coordinates') report.byCoordinates++;
    else report.byName++;
    out.add(
      makeSuggestion(
        {
          ...base,
          value: answer.placeId,
          display: `Took place in ${answer.name}`,
          evidence,
          confidence: far ? CONFIDENCE.likely : CONFIDENCE.sure,
          tier: far ? 'likely' : 'sure',
        },
        options,
      ),
      event,
    );
    report[far ? 'likely' : 'sure']++;
  }
  report.toCreate.places = created.size;
  return { planned: out.planned, report };
}

export function planEventPlaces(
  input: LinkingInput,
  options: EventPlacesOptions = {},
): Plan<EventPlacesReport> {
  if (options.book) return plan(input, options, options.book);
  // Alone: ask for every place once, then keep the second answers.
  const book = createPlaceBook(input.places);
  plan(input, options, book);
  return plan(input, options, book);
}
