import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  AppIcons,
  AppListIcons,
  type AppIconComponent,
} from '@/components/icons/appIcons';
import { getSong } from '@/curriculum/data/songs';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import { ROLE_NAME } from '../cortex/copy';
import type { GroupRole } from '../cortex/types';
import { describeRef } from '../describeRef';
import type { InteractionSlide, SlideSurface } from '../types';

// ── The class's vote for its Group Project (owner, 2026-11-16) ─────────────
// The slide before the Group Project: a column for each role, Promoter ·
// Producer · Performer, side by side (owner, 2026-11-16: no logo, no
// lines). Each is its picture, its role and the activity the class would do.
//
//   a student        a column is their vote; theirs reads "Your vote"
//   Present          a column goes to that Group Project; the leader is marked
//   room's screen    the columns alone; the counts once the teacher shows them
//   a phone          the columns as a list

/** What a surface hands the cards: each one's activity, the votes, a pick. */
export interface VoteSlot {
  /** Each option's activity: the first interaction of its Group Project. */
  activities?: readonly (Interaction | null)[];
  /** Each option's votes, once they may show on this screen. */
  counts?: readonly number[] | null;
  /** The option with the most votes, when the screen may say so. */
  leader?: number | null;
  /** A student's own vote. */
  mine?: number | null;
  /** A card's action: a student's vote, or the teacher's go. */
  onPick?: (option: number) => void;
  pickAction?: 'vote' | 'go';
}

const ROLE_ICON: Record<GroupRole, AppIconComponent> = {
  promoter: AppIcons.globe,
  producer: AppIcons.studio,
  performer: AppListIcons.artists,
};

/** Where each role works: its place's still, when the activity has no picture. */
const ROLE_STILL: Record<GroupRole, string> = {
  promoter: '/videos/places/globe.jpg',
  producer: '/videos/places/studio.jpg',
  performer: '/videos/places/learn.jpg',
};

const ROLE_BLURB: Record<GroupRole, LocalizedText> = {
  promoter: {
    en: 'Map the music’s world on the Globe',
    es: 'Mapea el mundo de la música en el Globo',
  },
  producer: {
    en: 'Build a track in the Studio',
    es: 'Crea una pista en el Studio',
  },
  performer: {
    en: 'Play a lesson together',
    es: 'Toquen una lección juntos',
  },
};

const ROLE_OF_MODULE: Partial<Record<string, GroupRole>> = {
  globe: 'promoter',
  studio: 'producer',
  learn: 'performer',
};

/**
 * An option's role: from its activity's module, else its Group Project
 * slide's id (`…-slide-group-producer`), else its name.
 */
export const roleOfOption = (
  option: LocalizedText,
  activity: Interaction | null | undefined,
  branchId: string | undefined,
): GroupRole | null => {
  const module = activity?.atlas?.module;
  const byModule = module ? ROLE_OF_MODULE[module] : undefined;
  if (byModule) return byModule;
  const byId = branchId?.match(/-group-(promoter|producer|performer)$/)?.[1];
  if (byId) return byId as GroupRole;
  return (
    (Object.keys(ROLE_NAME) as GroupRole[]).find(
      (role) => ROLE_NAME[role].en === option.en,
    ) ?? null
  );
};

interface VoteCard {
  option: number;
  name: string;
  role: GroupRole | null;
  /** The activity's name, else what the role does. */
  detail: string;
  image: string | null;
}

const cardsOf = (
  slide: InteractionSlide,
  options: readonly LocalizedText[],
  activities: readonly (Interaction | null)[] | undefined,
  language: StudentLanguage,
): VoteCard[] =>
  options.map((option, i) => {
    const activity = activities?.[i] ?? null;
    const role = roleOfOption(option, activity, slide.branches?.[i]);
    const ref = activity?.atlas?.activityRef;
    const described = ref ? describeRef(ref, { getSong }) : null;
    return {
      option: i,
      name: pickLocalized(option, language),
      role,
      detail:
        described?.title ??
        (role ? pickLocalized(ROLE_BLURB[role], language) : ''),
      image: described?.imageUrl ?? (role ? ROLE_STILL[role] : null),
    };
  });

interface GroupVoteMenuProps {
  slide: InteractionSlide;
  /** The vote's options (its interaction's `choice.options`). */
  options: readonly LocalizedText[];
  surface: SlideSurface;
  language: StudentLanguage;
  vote?: VoteSlot;
  /** A thumbnail: nothing to tap. */
  still?: boolean;
  /** A phone's column: the cards as a list. */
  stacked?: boolean;
  /** The box's size, in canvas px. */
  width?: number;
  height?: number;
  /** The surface's live status (Present's count and Show results). */
  statusChip?: ReactNode;
}

/** What a card says under its name: the votes, the student's own, the go. */
const CardFoot = ({
  card,
  vote,
  total,
  language,
}: {
  card: VoteCard;
  vote: VoteSlot | undefined;
  total: number;
  language: StudentLanguage;
}) => {
  const counts = vote?.counts;
  if (counts) {
    const n = counts[card.option] ?? 0;
    return (
      <span className="flex w-full items-center gap-[8px]">
        <span className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
          />
        </span>
        <span
          data-vote-count={card.option}
          className="shrink-0 text-[0.62em] tabular-nums text-white/70"
        >
          {n}{' '}
          {language === 'es'
            ? n === 1
              ? 'voto'
              : 'votos'
            : n === 1
              ? 'vote'
              : 'votes'}
        </span>
      </span>
    );
  }
  if (vote?.mine === card.option)
    return (
      <span className="inline-flex items-center gap-[4px] text-[0.62em] text-white">
        <Check className="size-[1.1em]" aria-hidden />
        {language === 'es' ? 'Tu voto' : 'Your vote'}
      </span>
    );
  return null;
};

export const GroupVoteMenu = ({
  slide,
  options,
  surface,
  language,
  vote,
  still = false,
  stacked = false,
  width = 1152,
  height = 308,
  statusChip,
}: GroupVoteMenuProps) => {
  const cards = cardsOf(slide, options, vote?.activities, language);
  const total = vote?.counts?.reduce((a, b) => a + b, 0) ?? 0;
  const leader = vote?.leader ?? null;
  const pick = surface === 'projector' || still ? undefined : vote?.onPick;
  const label = (card: VoteCard) =>
    vote?.pickAction === 'go'
      ? `Go to the ${card.name} Group Project`
      : `Vote for ${card.name}`;

  const control = (card: VoteCard, className: string) => {
    const chosen = vote?.mine === card.option || leader === card.option;
    const body = (
      <>
        <span
          data-vote-art={card.option}
          className={`relative block shrink-0 overflow-hidden border-white/10 bg-[#1b1b20] ${
            stacked ? 'size-14 rounded-lg' : 'min-h-0 w-full flex-1 border-b'
          }`}
        >
          {card.image && (
            <img
              src={card.image}
              alt=""
              draggable={false}
              className="size-full object-cover"
            />
          )}
        </span>
        <span
          data-vote-card={card.option}
          className={`flex min-w-0 flex-col justify-center gap-[6px] ${
            stacked ? 'flex-1' : 'shrink-0 px-[18px] py-[14px]'
          }`}
        >
          <span className="flex items-center gap-[6px] text-[0.9em] leading-none text-white">
            {card.role &&
              (() => {
                const Icon = ROLE_ICON[card.role];
                return (
                  <span data-vote-role={card.role} className="flex shrink-0">
                    <Icon className="size-[1.1em]" aria-hidden />
                  </span>
                );
              })()}
            {card.name}
            {leader === card.option && (
              <span className="ml-auto rounded-full bg-white px-[8px] py-[3px] text-[0.55em] text-black">
                {language === 'es' ? 'Adelante' : 'Leading'}
              </span>
            )}
          </span>
          <span className="truncate text-[0.62em] leading-tight text-white/55">
            {card.detail}
          </span>
          {/* The same room on every column, so their pictures line up. */}
          <span className="flex min-h-[1em] items-center">
            <CardFoot
              card={card}
              vote={vote}
              total={total}
              language={language}
            />
          </span>
        </span>
      </>
    );
    const classes = `${className} ${
      chosen ? 'border-white/60' : 'border-white/10'
    }`;
    if (pick)
      return (
        <button
          key={card.option}
          type="button"
          aria-label={label(card)}
          aria-pressed={vote?.mine === card.option}
          // Present's arrow keys move the slides; a card keeps its own.
          onKeyDown={(e) => e.stopPropagation()}
          onClick={() => pick(card.option)}
          className={`${classes} text-left transition-[border-color] duration-300 hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
        >
          {body}
        </button>
      );
    return (
      <div key={card.option} className={classes}>
        {body}
      </div>
    );
  };

  if (stacked)
    return (
      <div
        data-vote-menu=""
        className="flex w-full flex-col gap-2"
        style={{ fontSize: 'var(--slide-body-fz)' }}
      >
        {cards.map((card) =>
          control(
            card,
            'flex w-full items-center gap-3 rounded-xl border bg-[#141418] p-2 pr-4 text-white',
          ),
        )}
        {statusChip && <div className="self-center">{statusChip}</div>}
      </div>
    );

  // Three columns side by side (owner, 2026-11-16): each its picture on
  // top, then its role, its activity and the votes; the screen's own status
  // under them.
  return (
    <div
      data-vote-menu=""
      className="flex flex-col gap-[14px]"
      style={{ width, height, fontSize: 'var(--slide-body-fz)' }}
    >
      <div
        className="grid min-h-0 flex-1 gap-[32px]"
        style={{
          gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) =>
          control(
            card,
            'flex min-h-0 flex-col overflow-hidden rounded-[20px] border bg-[#141418] text-white shadow-[0_10px_32px_rgba(0,0,0,0.4)]',
          ),
        )}
      </div>
      {statusChip && (
        <div data-vote-status="" className="flex shrink-0 justify-center">
          {statusChip}
        </div>
      )}
    </div>
  );
};
