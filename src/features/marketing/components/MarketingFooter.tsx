import { Link } from 'react-router-dom';
import { LogoType } from '@/components/LogoType';
import { LegalRoutes, MarketingRoutes } from '@/constants/routes';

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
      { label: 'About', href: 'https://music-atlas.io/about' },
      { label: 'Help', href: 'https://help.music-atlas.io' },
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
  const cls = 'text-sm text-white/50 transition-colors hover:text-white';
  if (href.startsWith('/'))
    return (
      <Link to={href} className={cls}>
        {label}
      </Link>
    );
  return (
    <a href={href} className={cls} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
};

export const MarketingFooter = () => {
  return (
    <footer className="border-t border-white/[0.08] px-6 py-14 md:px-10">
      <div className="grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-3">
          <LogoType className="h-6 w-auto text-white" />
          <p className="max-w-xs text-sm text-white/50">
            Learn, play, and make music — all in one place.
          </p>
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
      <div className="mt-12 w-full border-t border-white/[0.06] pt-6 text-sm text-white/40">
        © {new Date().getFullYear()} Music Atlas. All rights reserved.
      </div>
    </footer>
  );
};
