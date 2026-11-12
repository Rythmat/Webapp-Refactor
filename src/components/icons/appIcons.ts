import type { ComponentType, CSSProperties } from 'react';
import { HiMusicalNote, HiTrophy } from 'react-icons/hi2';
import {
  MdChatBubble,
  MdCreditCard,
  MdPerson,
  MdSettings,
  MdShowChart,
} from 'react-icons/md';
import {
  PiBellFill,
  PiBookOpenTextFill,
  PiBooksFill,
  PiCompassFill,
  PiGameControllerFill,
  PiGraduationCapFill,
  PiHouseFill,
  PiLaptopFill,
  PiMicrophoneStageFill,
  PiMusicNotesFill,
  PiSignOutFill,
  PiSparkleFill,
  PiChatTextFill,
} from 'react-icons/pi';
import {
  RiDiscFill,
  RiEarthFill,
  RiInformationFill,
  RiQuestionFill,
} from 'react-icons/ri';

/** Any icon component: lucide's or react-icons'. */
export type AppIconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
  size?: number | string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

/**
 * The app's places and account items, as solid icons in Suno's way (owner,
 * 2026-11-11): each picked one by one from Phosphor, Remix, Material and
 * Heroicons. Use these wherever the app names one of them (its rail, tabs,
 * "Open in …" actions, search), so they read the same everywhere. The
 * one-colour copies in `public/icons/{learn,studio,globe,arcade,songs}-icon.svg`
 * draw the same four for `<img>` and mask uses.
 */
export const AppIcons = {
  home: PiHouseFill,
  learn: PiBookOpenTextFill,
  songs: RiDiscFill,
  studio: HiMusicalNote,
  library: PiBooksFill,
  globe: RiEarthFill,
  arcade: PiGameControllerFill,
  classroom: PiLaptopFill,
  office: PiGraduationCapFill,
  help: RiQuestionFill,
  about: RiInformationFill,
  profile: MdPerson,
  subscription: MdCreditCard,
  preferences: MdSettings,
  progress: MdShowChart,
  awards: HiTrophy,
  support: MdChatBubble,
  logOut: PiSignOutFill,
} satisfies Record<string, AppIconComponent>;

/**
 * Solid companions for lists that hold one of the places beside things that
 * aren't (search, the slide picker), so a list never mixes outline and fill.
 * Phosphor Fill, the set most of the places come from.
 */
export const AppListIcons = {
  artists: PiMicrophoneStageFill,
  theory: PiMusicNotesFill,
  pages: PiCompassFill,
  suggested: PiSparkleFill,
  questions: PiChatTextFill,
  notifications: PiBellFill,
} satisfies Record<string, AppIconComponent>;
