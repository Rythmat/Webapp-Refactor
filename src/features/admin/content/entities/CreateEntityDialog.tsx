import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { REGIONS } from '@/components/atlas/data/regions';
import type { RegionId } from '@/components/atlas/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { artistSlug, normalizeArtistName, toSlug } from '@/content/graph/slugs';
import type { EntityId } from '@/content/graph/types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  ContentApiError,
  useSaveContentItem,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../../consoleRoles';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { kindLabel } from '../graph/graphVocabulary';
import { useRepoMode } from '../repo/useRepoMode';
import { EntityPicker } from './EntityPicker';
import {
  API_ONLY_KINDS,
  CONTENT_KIND_OF,
  NAME_FIELD,
  type PickerKind,
} from './entityKinds';
import { boundedDistance, type EntityEntry } from './rankEntities';
import { addSessionEntity } from './sessionEntities';

/**
 * Create a record from a picker (design §3.4).
 *
 * It looks before it writes. A record whose slug the new one would take is
 * not created again — the dialog offers it instead ("Use existing"); records
 * with the same folded name, or one or two letters off, are listed as a
 * warning, because "Stevie Ray Vaughn" is usually "Stevie Ray Vaughan". The
 * PUT is create-only (`create: true` where the server supports it), so a
 * record someone else made meanwhile answers 409 SLUG_TAKEN rather than being
 * overwritten, and the dialog switches to offering it.
 *
 * Each kind asks for what its schema needs and no more: a record's billed
 * artist and format, a studio's town, a place's region and coordinates.
 * Everything else is edited on the record afterwards. Nothing is chosen for
 * the author: Format and Region start at "Choose…" and must be picked, and a
 * place starts as a globe pin only where the picker says it should
 * (`pin`: a birthplace is a place, not a pin).
 *
 * A studio, label or record has no code registry, so the console knows only
 * what the server lists; without the server's create-only save the dialog
 * refuses, since a plain save would overwrite a record it never saw.
 *
 * In repo mode (DEV only) there are no drafts: the record is written into
 * its repo file at once, published, and goes out with the next commit and
 * deploy. A place made a globe pin goes into the globe's cities, which
 * students see then; the dialog says so.
 */

const FORMATS = [
  'album',
  'single',
  'ep',
  'compilation',
  'live',
  'soundtrack',
] as const;

interface CreateEntityDialogProps {
  kind: PickerKind;
  initialName: string;
  /** The index the picker searched, for the look-before-writing check. */
  existing: readonly EntityEntry[];
  /** For a place: whether it starts as a globe pin. */
  pin?: boolean;
  onCreated(entry: EntityEntry): void;
  onClose(): void;
}

export const CreateEntityDialog = ({
  kind,
  initialName,
  existing,
  pin: pinAtFirst = true,
  onCreated,
  onClose,
}: CreateEntityDialogProps) => {
  const { role } = useAuthContext();
  const caps = useCapabilities();
  const save = useSaveContentItem();
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const contentKind = CONTENT_KIND_OF[kind];
  const served = !!contentKind && caps.isServed(contentKind);
  // Without create-only saves, only a kind the console knows in full is safe.
  const blind = API_ONLY_KINDS.has(kind) && !caps.feature('create');

  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number] | ''>('');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [region, setRegion] = useState<RegionId | ''>('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [pin, setPin] = useState(pinAtFirst);
  const [taken, setTaken] = useState(false);

  const slug = useMemo(() => {
    if (kind === 'artist') return artistSlug(name);
    if (kind === 'release') {
      return artistId && name.trim()
        ? `${artistId}-${toSlug(name)}`
        : toSlug(name);
    }
    return toSlug(name);
  }, [kind, name, artistId]);

  const same = existing.find((e) => e.kind === kind && e.slug === slug);
  const near = useMemo(() => {
    const folded = normalizeArtistName(name);
    if (folded.length < 3) return [];
    return existing
      .filter((e) => e.kind === kind && e.slug !== slug)
      .filter((e) =>
        [e.name, ...(e.aliases ?? [])].some((spelling) => {
          const other = normalizeArtistName(spelling);
          return other === folded || boundedDistance(other, folded, 2) <= 2;
        }),
      )
      .slice(0, 5);
  }, [existing, kind, name, slug]);

  const missing: string[] = [];
  if (!name.trim()) missing.push('a name');
  if (kind === 'release' && !artistId) missing.push('the billed artist');
  if (kind === 'release' && !format) missing.push('a format');
  if (kind === 'studio' && !placeId) missing.push('where it is');
  if (kind === 'place') {
    if (!country.trim()) missing.push('the country');
    if (!region) missing.push('the region');
    if (!Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lng)))
      missing.push('coordinates');
  }

  const body = (): Record<string, unknown> => {
    const nameField = NAME_FIELD[kind] ?? 'name';
    const identity = caps.identityOf(contentKind!);
    const base: Record<string, unknown> = {
      [identity]: slug,
      [nameField]: name.trim(),
    };
    switch (kind) {
      case 'artist':
        return group ? { ...base, group: true } : base;
      case 'studio':
        return { ...base, placeId };
      case 'release':
        return {
          ...base,
          artistIds: [artistId],
          format,
          ...(year ? { year: Number(year) } : {}),
        };
      case 'place':
        return {
          ...base,
          country: country.trim(),
          subdivision: subdivision.trim(),
          region,
          coordinates: [parseFloat(lat), parseFloat(lng)],
          genres: [],
          description: '',
          activeDecades: [],
          ...(pin ? {} : { pin: false }),
        };
      default:
        return base;
    }
  };

  const submit = async () => {
    if (!contentKind || blind || missing.length || same) return;
    setTaken(false);
    try {
      await save.mutateAsync({
        kind: contentKind,
        slug,
        body: body(),
        // Repo mode has no drafts: anything else is saved published anyway.
        status: repo ? 'published' : 'draft',
        ...(caps.feature('create') ? { create: true as const } : {}),
      });
      const entry: EntityEntry = {
        id: `${kind}:${slug}` as EntityId,
        kind,
        slug,
        name: name.trim(),
        source: repo
          ? 'published'
          : isContentEditor(role)
            ? 'pending'
            : 'draft',
      };
      addSessionEntity(entry);
      onCreated(entry);
    } catch (error) {
      if (error instanceof ContentApiError && error.code === 'SLUG_TAKEN') {
        setTaken(true);
      }
    }
  };

  const label = kindLabel(kind).toLowerCase();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New {label}</DialogTitle>
          <DialogDescription>
            {repo
              ? kind === 'place' && pin
                ? 'Written into the repo’s files at once, as a pin in the globe’s cities: students see it once that is committed and deployed.'
                : 'Written into its repo file at once; the change goes out with the next commit and deploy.'
              : isContentEditor(role)
                ? 'Saved as a proposal: an admin approves it before it is published.'
                : 'Saved as a draft; it goes live with the next publish.'}
          </DialogDescription>
        </DialogHeader>

        {!served ? (
          <ConsoleCallout tone="warning">
            The content API does not store {label}s yet, so they cannot be
            created here.
          </ConsoleCallout>
        ) : blind ? (
          <ConsoleCallout tone="warning">
            This server cannot create a {label} without the risk of overwriting
            one with the same id: it has no create-only save, and the console
            only knows the {label}s it lists. Create it once the server supports
            that.
          </ConsoleCallout>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label={kind === 'release' ? 'Title' : 'Name'}>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="mt-1 text-xs text-white/40">
                Id: {kind}:{slug || '…'}
              </p>
            </Field>

            {kind === 'artist' && (
              <label className="flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={group}
                  onChange={(e) => setGroup(e.target.checked)}
                />
                A group or band, not one person
              </label>
            )}

            {kind === 'release' && (
              <>
                <Field label="Billed artist">
                  <EntityPicker
                    kind="artist"
                    value={artistId}
                    onChange={(s) => setArtistId(s)}
                  />
                </Field>
                <div className="flex gap-3">
                  <Field label="Format">
                    <select
                      aria-label="Format"
                      value={format}
                      onChange={(e) =>
                        setFormat(e.target.value as (typeof FORMATS)[number])
                      }
                      className="h-9 rounded-md border border-white/[0.12] bg-transparent px-2 text-sm"
                    >
                      <option value="" disabled>
                        Choose…
                      </option>
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Year">
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-24"
                    />
                  </Field>
                </div>
              </>
            )}

            {kind === 'studio' && (
              <Field label="Where it is">
                <EntityPicker
                  kind="place"
                  value={placeId}
                  onChange={(s) => setPlaceId(s)}
                />
              </Field>
            )}

            {kind === 'place' && (
              <>
                <div className="flex gap-3">
                  <Field label="Country">
                    <Input
                      aria-label="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </Field>
                  <Field label="State or province">
                    <Input
                      aria-label="State or province"
                      value={subdivision}
                      onChange={(e) => setSubdivision(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Region">
                  <select
                    aria-label="Region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value as RegionId)}
                    className="h-9 w-full rounded-md border border-white/[0.12] bg-transparent px-2 text-sm"
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex gap-3">
                  <Field label="Latitude">
                    <Input
                      aria-label="Latitude"
                      inputMode="decimal"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      aria-label="Longitude"
                      inputMode="decimal"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={pin}
                    onChange={(e) => setPin(e.target.checked)}
                  />
                  Show it as a pin on the globe
                </label>
              </>
            )}

            {(same || taken) && (
              <ConsoleCallout tone="warning">
                {same
                  ? `${same.name} already has this id.`
                  : 'Someone created this id meanwhile.'}{' '}
                {same && (
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => onCreated(same)}
                  >
                    Use existing
                  </button>
                )}
              </ConsoleCallout>
            )}
            {!same && near.length > 0 && (
              <ConsoleCallout tone="neutral">
                Is it one of these?
                <ul className="mt-1 flex flex-col gap-0.5">
                  {near.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="underline-offset-2 hover:underline"
                        onClick={() => onCreated(e)}
                      >
                        {e.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </ConsoleCallout>
            )}
            {save.error && !taken && (
              <ConsoleCallout tone="danger">
                {save.error.message}
              </ConsoleCallout>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              !served || blind || missing.length > 0 || !!same || save.isPending
            }
            title={missing.length ? `Needs ${missing.join(', ')}` : undefined}
          >
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
    <Label className="text-xs text-white/55">{label}</Label>
    {children}
  </div>
);
