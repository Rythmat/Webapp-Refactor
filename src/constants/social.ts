import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

/** Official Music Atlas social profiles (shared by the app + marketing footers). */
export const SOCIAL_LINKS = [
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@MusicAtlasIO',
    Icon: Youtube,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/musicatlas.io/',
    Icon: Instagram,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/musicatlasio/',
    Icon: Facebook,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/music-atlas/',
    Icon: Linkedin,
  },
] as const;
