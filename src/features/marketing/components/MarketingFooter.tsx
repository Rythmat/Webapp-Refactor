import { Link } from 'react-router-dom';
import { LogoType } from '@/components/LogoType';
import { LegalRoutes, MarketingRoutes } from '@/constants/routes';
import { SOCIAL_LINKS } from '@/constants/social';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Studio', href: MarketingRoutes.studio() },
      { label: 'Learn', href: MarketingRoutes.learn() },
      { label: 'Arcade', href: MarketingRoutes.arcade() },
      { label: 'Globe', href: MarketingRoutes.globe() },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Blog', href: MarketingRoutes.blog() },
      { label: 'For Teachers', href: MarketingRoutes.teachers() },
      { label: 'Help', href: 'https://help.music-atlas.io' },
      { label: 'Contact', href: 'mailto:hello@music-atlas.io' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: LegalRoutes.privacyPolicy() },
      { label: 'Terms', href: LegalRoutes.termsOfService() },
    ],
  },
];

const FooterLink = ({ href, label }: { href: string; label: string }) => {
  const cls =
    'w-fit text-sm text-white/55 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none';
  if (href.startsWith('/'))
    return (
      <Link to={href} className={cls}>
        {label}
      </Link>
    );
  if (href.startsWith('mailto:'))
    return (
      <a href={href} className={cls}>
        {label}
      </a>
    );
  return (
    <a href={href} className={cls} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
};

/**
 * Marketing footer — shared by the landing and every `/features/*` page. Link
 * columns + social icons, then an oversized, faded wordmark watermark
 * (Linear/Attio-style) as the closing flourish.
 */
export const MarketingFooter = () => {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] px-6 pt-16 md:px-10">
      <div className="grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-4">
          <LogoType className="h-6 w-auto text-white" />
          <p className="max-w-xs text-sm text-white/55">
            Learn, play, and make music — all in one place.
          </p>
          <ul className="flex items-center gap-2" aria-label="Social">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <nav
            key={col.title}
            aria-label={col.title}
            className="flex flex-col gap-3"
          >
            <h3 className="text-sm font-semibold text-white">{col.title}</h3>
            {col.links.map((l) => (
              <FooterLink key={l.label} href={l.href} label={l.label} />
            ))}
          </nav>
        ))}
      </div>
      <div className="mt-12 flex w-full flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-6 text-sm text-white/45">
        <span>
          © {new Date().getFullYear()} Music Atlas. All rights reserved.
        </span>
        <span>Made in Denver, CO</span>
      </div>
      {/* Oversized wordmark watermark, cropped by the footer's bottom edge. */}
      <div
        aria-hidden
        className="pointer-events-none mt-10 select-none opacity-[0.07] [mask-image:linear-gradient(to_bottom,#000_20%,transparent_95%)]"
      >
        <LogoType className="mb-[-3%] h-auto w-full" />
      </div>
    </footer>
  );
};
