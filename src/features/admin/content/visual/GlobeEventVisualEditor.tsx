/* eslint-disable react/jsx-sort-props */
import { Calendar, MapPin } from 'lucide-react';
import { type FC } from 'react';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import {
  DetailCell,
  InlineNumber,
  InlineTagList,
  InlineText,
  InlineTextarea,
} from './Editable';
import { YouTubeLinkField, extractYouTubeId } from './YouTubeLinkField';

/**
 * A globe event, laid out as the expanded card in the globe's details panel.
 *
 * Same dark glass panel, same title / year+city line, same genre badges,
 * description and video — clicking any of them edits it in place. The
 * coordinates and id sit in a strip beneath, because they steer the pin and the
 * references from arcs and pathways but never appear on the card itself.
 */

export interface GlobeEventBody {
  id: string;
  year: number;
  location: { lat: number; lng: number; city: string; country: string };
  genre: string[];
  title: string;
  description: string;
  tags: string[];
  videoId?: string;
}

export const GlobeEventVisualEditor: FC<{
  event: GlobeEventBody;
  onChange: (event: GlobeEventBody) => void;
}> = ({ event, onChange }) => {
  const patch = (next: Partial<GlobeEventBody>) =>
    onChange({ ...event, ...next });

  const location = event.location ?? {
    lat: 0,
    lng: 0,
    city: '',
    country: '',
  };
  const patchLocation = (next: Partial<GlobeEventBody['location']>) =>
    patch({ location: { ...location, ...next } });

  return (
    <div className="flex flex-col gap-4">
      {/* ── The card as it appears on the globe ── */}
      <div className="max-w-2xl rounded-2xl border border-white/10 bg-black/20 p-4 shadow-2xl backdrop-blur-md">
        <div className="rounded-xl border border-[#60a5fa66] bg-[#60a5fa1a] p-4">
          <h4 className="text-lg font-semibold leading-snug text-white">
            <InlineText
              value={event.title}
              onChange={(value) => patch({ title: value })}
              placeholder="Event title"
              ariaLabel="Event title"
            />
          </h4>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              <InlineNumber
                value={event.year}
                onChange={(value) => patch({ year: value ?? 0 })}
                min={-4000}
                max={2200}
                ariaLabel="Year"
              />
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              <InlineText
                value={location.city}
                onChange={(value) => patchLocation({ city: value })}
                placeholder="City"
                ariaLabel="City"
              />
              <span className="text-white/25">·</span>
              <InlineText
                value={location.country}
                onChange={(value) => patchLocation({ country: value })}
                placeholder="Country"
                ariaLabel="Country"
              />
            </span>
          </div>

          <InlineTagList
            values={event.genre ?? []}
            onChange={(values) => patch({ genre: values })}
            renderTag={(genre) => <GenreBadge genre={genre} />}
            addLabel="Genre"
            ariaLabel="Genres"
            className="mt-2"
          />

          <InlineTextarea
            value={event.description}
            onChange={(value) => patch({ description: value })}
            placeholder="Describe what happened here, and why it mattered."
            ariaLabel="Description"
            rows={5}
            className="mt-2 text-sm leading-relaxed text-white/70"
          />

          <div className="mt-3">
            <YouTubeLinkField
              value={event.videoId ?? ''}
              onChange={(raw) =>
                patch({ videoId: extractYouTubeId(raw) ?? undefined })
              }
              label="Video"
              previewTitle={event.title || 'Event video'}
            />
          </div>
        </div>
      </div>

      {/* ── Fields that steer the pin but never show on the card ── */}
      <div className="grid max-w-2xl grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 md:grid-cols-4">
        <DetailCell label="Id / slug" className="col-span-2">
          <InlineText
            value={event.id}
            onChange={(value) => patch({ id: value.trim() })}
            placeholder="evt-slug"
            ariaLabel="Event id"
            className="font-mono text-xs"
          />
          <p className="mt-0.5 text-[10px] text-white/25">
            Referenced by influence arcs and pathways — renaming is checked at
            publish time.
          </p>
        </DetailCell>
        <DetailCell label="Latitude">
          <InlineNumber
            value={location.lat}
            onChange={(value) => patchLocation({ lat: value ?? 0 })}
            min={-90}
            max={90}
            step={0.0001}
            ariaLabel="Latitude"
          />
        </DetailCell>
        <DetailCell label="Longitude">
          <InlineNumber
            value={location.lng}
            onChange={(value) => patchLocation({ lng: value ?? 0 })}
            min={-180}
            max={180}
            step={0.0001}
            ariaLabel="Longitude"
          />
        </DetailCell>
        <DetailCell label="Tags" className="col-span-2 md:col-span-4">
          <InlineTagList
            values={event.tags ?? []}
            onChange={(values) => patch({ tags: values })}
            addLabel="Tag"
            ariaLabel="Tags"
          />
        </DetailCell>
      </div>
    </div>
  );
};
