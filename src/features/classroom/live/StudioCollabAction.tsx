/**
 * StudioCollabAction — the student-device action for a `studio-collab` slide.
 * Lives under `live/` (not `slides/`) because it reads the enrollment roster
 * for the partners' names.
 *
 * A pair meets in one Studio room without anyone reading a code aloud: every
 * member computes the same room code from the session and the pair's members
 * (`pairRoomCode`). The host opens the room as its owner (`?collab=<code>
 * &host=1`); partners join it (`?collab=<code>&pair=1`), and their Studio
 * keeps trying until the host's room exists, so who clicks first does not
 * matter. Solo grouping opens a fresh project.
 *
 * The Studio opens in a NEW TAB. Navigating this tab would unmount the live
 * session page and close the student's session socket (`useSessionSync` is
 * only mounted there). A new tab needs a click, so nobody is moved
 * automatically; if the browser blocks the tab, an "open here instead" link
 * is the fallback, as in `AppRouteLaunch`.
 */
import { ExternalLink, Rocket, Users } from 'lucide-react';
import { useState } from 'react';
import { useEnrollments } from '../enrollments';
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../types';
import type { SessionPair } from './sessionsStore';
import {
  pairHostHref,
  pairPartnerHref,
  pairRoomCode,
  soloStudioHref,
} from './studioPairRoom';

export interface StudioCollabActionProps {
  grouping: 'pairs' | 'solo';
  pairs: SessionPair[] | null | undefined;
  myEnrollmentId: string | undefined;
  /** The live session: part of the pair's room code. */
  sessionId: string | undefined;
  classroomId: string;
  language: StudentLanguage;
  disabled?: boolean;
}

const COPY = {
  solo: {
    en: 'Open the Studio and start creating.',
    es: 'Abre el Studio y empieza a crear.',
  },
  open: { en: 'Open the Studio', es: 'Abre el Studio' },
  openShared: { en: 'Open our shared Studio', es: 'Abre nuestro Studio' },
  waiting: {
    en: 'Your teacher is setting up the groups…',
    es: 'Tu maestro está formando los grupos…',
  },
  openHere: { en: 'open here instead', es: 'abrir aquí' },
  yourPartner: { en: 'your partner', es: 'tu compañero' },
} satisfies Record<string, LocalizedText>;

/** "Ana", "Ana and Ben", "Ana, Ben and Cy". */
const nameList = (names: string[], and: string): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;

const hostCopy = (partners: string[]): LocalizedText => {
  const en = partners.length ? nameList(partners, 'and') : '';
  const es = partners.length ? nameList(partners, 'y') : '';
  const join = partners.length > 1 ? 'se unirán' : 'se unirá';
  return {
    en: `You're hosting. Open your shared Studio, and ${en || COPY.yourPartner.en} will join you there.`,
    es: `Tú eres el anfitrión. Abre su Studio compartido y ${es || COPY.yourPartner.es} ${join} contigo.`,
  };
};

const partnerCopy = (host: string | undefined): LocalizedText => ({
  en: `${host ?? 'Your partner'} is hosting. Open the Studio to join their room. It opens as soon as they do.`,
  es: `${host ?? 'Tu compañero'} es el anfitrión. Abre el Studio para unirte a su sala. Se abrirá en cuanto entre.`,
});

const joinLabel = (host: string | undefined): LocalizedText =>
  host
    ? { en: `Join ${host}'s Studio`, es: `Únete al Studio de ${host}` }
    : { en: 'Join the shared Studio', es: 'Únete al Studio compartido' };

const roomCodeLine = (code: string): LocalizedText => ({
  en: `Room code: ${code}`,
  es: `Código de sala: ${code}`,
});

const Bi = ({
  text,
  language,
}: {
  text: LocalizedText;
  language: StudentLanguage;
}) => {
  const alt = secondaryLine(text, language);
  return (
    <>
      {pickLocalized(text, language)}
      {alt && <span className="text-white/40"> · {alt}</span>}
    </>
  );
};

export const StudioCollabAction = ({
  grouping,
  pairs,
  myEnrollmentId,
  sessionId,
  classroomId,
  language,
  disabled,
}: StudioCollabActionProps) => {
  const { getEnrollment } = useEnrollments(classroomId);
  const nameOf = (enrollmentId: string): string | undefined =>
    getEnrollment(enrollmentId)?.displayName || undefined;

  // Solo grouping — everyone opens their own Studio.
  if (grouping === 'solo') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-white/60">
          <Bi text={COPY.solo} language={language} />
        </p>
        <LaunchButton
          href={soloStudioHref()}
          label={COPY.open}
          language={language}
          disabled={disabled}
        />
      </div>
    );
  }

  const myPair = myEnrollmentId
    ? pairs?.find((p) => p.enrollmentIds.includes(myEnrollmentId))
    : undefined;
  if (!myPair || !sessionId) {
    return (
      <p className="text-sm text-white/55">
        <Bi text={COPY.waiting} language={language} />
      </p>
    );
  }

  const code = pairRoomCode(sessionId, myPair.enrollmentIds);

  if (myPair.hostEnrollmentId === myEnrollmentId) {
    const partners = myPair.enrollmentIds
      .filter((id) => id !== myEnrollmentId)
      .map(nameOf)
      .filter((name): name is string => Boolean(name));
    return (
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-white/60">
          <Users className="h-4 w-4 shrink-0 text-[#7ecfcf]" />
          <span>
            <Bi text={hostCopy(partners)} language={language} />
          </span>
        </p>
        <LaunchButton
          href={pairHostHref(code)}
          label={COPY.openShared}
          language={language}
          disabled={disabled}
        />
        <RoomCode code={code} language={language} />
      </div>
    );
  }

  const host = nameOf(myPair.hostEnrollmentId);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/60">
        <Bi text={partnerCopy(host)} language={language} />
      </p>
      <LaunchButton
        href={pairPartnerHref(code)}
        label={joinLabel(host)}
        language={language}
        disabled={disabled}
      />
      <RoomCode code={code} language={language} />
    </div>
  );
};

/** The code itself, in case the Studio has to be joined by hand. */
const RoomCode = ({
  code,
  language,
}: {
  code: string;
  language: StudentLanguage;
}) => (
  <p className="text-xs tracking-wide text-white/40">
    <Bi text={roomCodeLine(code)} language={language} />
  </p>
);

const LaunchButton = ({
  href,
  label,
  language,
  disabled,
}: {
  href: string;
  label: LocalizedText;
  language: StudentLanguage;
  disabled?: boolean;
}) => {
  const [blocked, setBlocked] = useState(false);
  const open = () => {
    // No 'noopener' feature: with it `window.open` always returns null, and
    // a blocked tab could not be told apart. Cut the opener link instead.
    const tab = window.open(href, '_blank');
    if (tab) {
      tab.opener = null;
      setBlocked(false);
    } else {
      setBlocked(true);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={open}
        className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.08] px-6 py-4 text-base font-semibold text-[#7ecfcf] transition-colors hover:border-[#7ecfcf]/70 hover:bg-[#7ecfcf]/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Rocket className="h-5 w-5" />
        <Bi text={label} language={language} />
      </button>
      {blocked && (
        <a
          href={href}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-[#7ecfcf]/80 underline hover:text-[#7ecfcf]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <Bi text={COPY.openHere} language={language} />
        </a>
      )}
    </div>
  );
};
