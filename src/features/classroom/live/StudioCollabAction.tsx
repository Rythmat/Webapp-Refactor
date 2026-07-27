/**
 * StudioCollabAction — the student-device pairing affordance for a
 * `studio-collab` slide. Lives under `live/` (not `slides/`) because it reads
 * the enrollment roster to resolve a partner's account id.
 *
 * On `pairs`: the pair's `hostEnrollmentId` client auto-navigates to
 * `/studio/editor?collab=new&invite=<partnerAccountIds>` (the existing DawApp
 * boot param mints the room + sends invites); partners open the Studio and
 * accept via the existing invite bell. Solo grouping → `/studio/editor?new=1`.
 */
import { Rocket, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnrollments } from '../enrollments';
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../types';
import type { SessionPair } from './sessionsStore';

export interface StudioCollabActionProps {
  grouping: 'pairs' | 'solo';
  pairs: SessionPair[] | null | undefined;
  myEnrollmentId: string | undefined;
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
  hostSetup: {
    en: 'Setting up your shared room…',
    es: 'Preparando su sala compartida…',
  },
  partner: {
    en: 'Your partner is opening a shared room — open the Studio and accept the invite.',
    es: 'Tu compañero está abriendo una sala — abre el Studio y acepta la invitación.',
  },
  waiting: {
    en: 'Your teacher is setting up the groups…',
    es: 'Tu maestro está formando los grupos…',
  },
} satisfies Record<string, LocalizedText>;

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
  classroomId,
  language,
  disabled,
}: StudioCollabActionProps) => {
  const navigate = useNavigate();
  const { getEnrollment } = useEnrollments(classroomId);
  const navigatedRef = useRef(false);

  const myPair =
    grouping === 'pairs' && myEnrollmentId
      ? pairs?.find((p) => p.enrollmentIds.includes(myEnrollmentId))
      : undefined;
  const isHost = myPair?.hostEnrollmentId === myEnrollmentId;
  const partnerAccountIds = myPair
    ? myPair.enrollmentIds
        .filter((id) => id !== myEnrollmentId)
        .map((id) => getEnrollment(id)?.accountId)
        .filter((id): id is string => Boolean(id))
    : [];

  const hostHref =
    partnerAccountIds.length > 0
      ? `/studio/editor?collab=new&invite=${partnerAccountIds
          .map(encodeURIComponent)
          .join(',')}`
      : null;

  // The host auto-navigates once, when the pairing lands.
  useEffect(() => {
    if (disabled || navigatedRef.current) return;
    if (grouping === 'pairs' && isHost && hostHref) {
      navigatedRef.current = true;
      navigate(hostHref);
    }
  }, [disabled, grouping, isHost, hostHref, navigate]);

  // Solo grouping — everyone opens their own Studio.
  if (grouping === 'solo') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-white/60">
          <Bi text={COPY.solo} language={language} />
        </p>
        <LaunchButton
          href="/studio/editor?new=1"
          label={COPY.open}
          language={language}
          disabled={disabled}
        />
      </div>
    );
  }

  if (!myPair) {
    return (
      <p className="text-sm text-white/55">
        <Bi text={COPY.waiting} language={language} />
      </p>
    );
  }

  if (isHost) {
    return (
      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-white/60">
          <Users className="h-4 w-4 text-[#7ecfcf]" />
          <Bi text={COPY.hostSetup} language={language} />
        </p>
        {hostHref && (
          <LaunchButton
            href={hostHref}
            label={COPY.openShared}
            language={language}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  // Partner (non-host) — open the Studio and accept the invite bell.
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/60">
        <Bi text={COPY.partner} language={language} />
      </p>
      <LaunchButton
        href="/studio/editor"
        label={COPY.open}
        language={language}
        disabled={disabled}
      />
    </div>
  );
};

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
  const navigate = useNavigate();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate(href)}
      className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.08] px-6 py-4 text-base font-semibold text-[#7ecfcf] transition-colors hover:border-[#7ecfcf]/70 hover:bg-[#7ecfcf]/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Rocket className="h-5 w-5" />
      <Bi text={label} language={language} />
    </button>
  );
};
