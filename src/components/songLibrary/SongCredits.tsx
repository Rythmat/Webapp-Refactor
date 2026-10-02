import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasRoutes } from '@/constants/routes';
import { getInstrument } from '@/curriculum/data/instruments';
import type { Credit, Song } from '@/curriculum/types/songLibrary';

/**
 * The recording's credits, as pills.
 *
 * Every pill is an entity the Globe constellation will walk, so each one links
 * to the Globe wherever the Globe can already receive it. Today that is
 * `artist`, `place` and `era` — the params `useAtlasNavigate` understands. A
 * label or an instrument has no destination yet, so those render as plain
 * pills rather than links that would lie about where they go; when those
 * become real Globe entities, only `hrefFor` changes.
 *
 * `unverified` credits render muted and italic. They are shown rather than
 * hidden, because a credit nobody has confirmed is still the best lead anyone
 * has — but it should never look like a fact.
 */

// `/atlas` is the Globe Dashboard and drops these params silently; the full
// globe at `/atlas/globe` is what reads them and flies to the pin.
const atlas = {
  artist: (name: string) =>
    `${AtlasRoutes.globe()}?artist=${encodeURIComponent(name)}`,
  place: (name: string) =>
    `${AtlasRoutes.globe()}?place=${encodeURIComponent(name)}`,
  era: (name: string) =>
    `${AtlasRoutes.globe()}?era=${encodeURIComponent(name)}`,
};

/** Roles whose name is a person or group the Globe may know. */
const LINKABLE_ROLES = new Set([
  'performer',
  'vocals',
  'songwriter',
  'producer',
]);

const ROLE_LABEL: Record<string, string> = {
  performer: 'Plays',
  vocals: 'Vocals',
  songwriter: 'Written by',
  producer: 'Produced by',
  engineer: 'Engineered by',
  arranger: 'Arranged by',
  conductor: 'Conducted by',
};

const Pill: FC<{
  label: string;
  href?: string;
  muted?: boolean;
  title?: string;
}> = ({ label, href, muted, title }) => {
  const navigate = useNavigate();
  const className = `rounded-full border px-2.5 py-1 text-xs transition-colors ${
    muted
      ? 'border-white/10 italic text-white/35'
      : 'border-white/15 text-white/75'
  } ${href ? 'cursor-pointer hover:border-[#7ecfcf] hover:text-[#7ecfcf]' : ''}`;

  if (!href)
    return (
      <span className={className} title={title}>
        {label}
      </span>
    );
  return (
    <button
      type="button"
      className={className}
      title={title ?? `Open ${label} in the Globe`}
      onClick={() => navigate(href)}
    >
      {label}
    </button>
  );
};

const Group: FC<{ heading: string; children: React.ReactNode }> = ({
  heading,
  children,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-[11px] uppercase tracking-wide text-white/30">
      {heading}
    </span>
    {children}
  </div>
);

/** What a credit says they did: the instrument, else the role. */
const didOf = (credit: Credit): string => {
  const instrument = credit.instrument
    ? getInstrument(credit.instrument)
    : undefined;
  return instrument
    ? instrument.name
    : (ROLE_LABEL[credit.role] ?? credit.role);
};

/**
 * One person's credits within a row, in the order they first appear: a
 * player on three instruments, or an engineer who also produced, is one
 * pill whose tooltip lists everything they did.
 */
const byPerson = (credits: readonly Credit[]): Credit[][] => {
  const people = new Map<string, Credit[]>();
  for (const credit of credits) {
    const held = people.get(credit.name);
    if (held) held.push(credit);
    else people.set(credit.name, [credit]);
  }
  return [...people.values()];
};

/** One person's pill: the name, with what they did as its tooltip. */
const CreditPill: FC<{ credits: readonly Credit[] }> = ({ credits }) => {
  const [credit] = credits;
  const did = [...new Set(credits.map(didOf))].join(', ');
  const unverified = credits.every((c) => c.unverified);
  return (
    <Pill
      label={credit.name}
      href={
        credits.some((c) => LINKABLE_ROLES.has(c.role))
          ? atlas.artist(credit.name)
          : undefined
      }
      muted={unverified}
      title={unverified ? `${did} — unconfirmed` : did}
    />
  );
};

export const SongCredits: FC<{ song: Song }> = ({ song }) => {
  const { credits = [], session, relatedRecordings = [] } = song;
  // The session as a student sees it: its text and year. Its ids and source
  // (song v2) are the console's, and a session holding only those shows no
  // "Recorded" at all rather than an empty one.
  const recorded =
    session &&
    (session.studio || session.city || session.label || session.recordedYear)
      ? session
      : undefined;
  if (!credits.length && !recorded && !relatedRecordings.length) return null;

  const byRole = (...roles: string[]) =>
    credits.filter((c) => roles.includes(c.role));
  // Billed artists lead, and are listed once even when they hold several
  // credits — Paich is one artist, not a vocal credit plus two instruments.
  const billed = [
    ...new Map(
      credits.filter((c) => c.primary).map((c) => [c.name, c]),
    ).values(),
  ];
  const billedNames = new Set(billed.map((c) => c.name));
  const players = byRole('performer', 'vocals').filter(
    (c) => !billedNames.has(c.name),
  );
  const writers = byRole('songwriter');
  const desk = byRole('producer', 'engineer', 'arranger', 'conductor');

  // One pill per instrument actually played, not one per credit.
  const instruments = [
    ...new Set(credits.map((c) => c.instrument).filter(Boolean)),
  ]
    .map((id) => getInstrument(id as string))
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
      {billed.length > 0 && (
        <Group heading="Artists">
          {billed.map((c) => (
            <CreditPill key={`primary-${c.name}`} credits={[c]} />
          ))}
        </Group>
      )}

      {players.length > 0 && (
        <Group heading="Sidemen">
          {byPerson(players).map((held) => (
            <CreditPill key={`${held[0].name}-p`} credits={held} />
          ))}
        </Group>
      )}

      {instruments.length > 0 && (
        <Group heading="Instruments">
          {instruments.map((i) => (
            <Pill key={i!.id} label={i!.name} title={i!.section} />
          ))}
        </Group>
      )}

      {writers.length > 0 && (
        <Group heading="Written by">
          {byPerson(writers).map((held) => (
            <CreditPill key={`${held[0].name}-w`} credits={held} />
          ))}
        </Group>
      )}

      {desk.length > 0 && (
        <Group heading="Studio">
          {byPerson(desk).map((held) => (
            <CreditPill key={`${held[0].name}-d`} credits={held} />
          ))}
        </Group>
      )}

      {recorded && (
        <Group heading="Recorded">
          {recorded.studio && <Pill label={recorded.studio} />}
          {recorded.city && (
            <Pill label={recorded.city} href={atlas.place(recorded.city)} />
          )}
          {recorded.label && <Pill label={recorded.label} title="Label" />}
          {recorded.recordedYear && (
            <Pill
              label={String(recorded.recordedYear)}
              href={atlas.era(
                `${Math.floor(recorded.recordedYear / 10) * 10}s`,
              )}
              title={`Recorded ${recorded.recordedYear}`}
            />
          )}
        </Group>
      )}

      {relatedRecordings.length > 0 && (
        <Group heading="Also recorded by">
          {relatedRecordings.map((r, i) => (
            <Pill
              key={`${r.artist}-${i}`}
              label={r.year ? `${r.artist} (${r.year})` : r.artist}
              href={atlas.artist(r.artist)}
              muted={r.unverified}
              title={r.relation}
            />
          ))}
        </Group>
      )}
    </div>
  );
};
