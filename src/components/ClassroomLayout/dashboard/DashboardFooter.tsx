import { Link } from 'react-router-dom';
import { LegalRoutes } from '@/constants/routes';
import { SOCIAL_LINKS } from '@/constants/social';

interface Column {
  title: string;
  links: Array<{ label: string; href: string }>;
}

const COLUMNS: Column[] = [
  {
    title: 'Support',
    links: [
      { label: 'Contact us', href: 'mailto:aaron@musicatlas.io' },
      { label: 'Report a bug', href: 'mailto:aaron@musicatlas.io?subject=Bug' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: LegalRoutes.privacyPolicy() },
      { label: 'Terms & Conditions', href: LegalRoutes.termsOfService() },
    ],
  },
];

const linkCls =
  'text-base text-white/80 transition-colors hover:text-white md:text-lg';

/** `showLogo`: the animated logo on the right (off on the public landing). */
export const DashboardFooter = ({
  showLogo = true,
}: { showLogo?: boolean } = {}) => {
  return (
    <footer className="mt-8 border-t border-white/15 pt-8 text-base text-white/70 md:mt-12 md:pt-10 md:text-lg">
      <div className="flex flex-wrap items-start gap-6 md:gap-10">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-6 sm:mx-auto sm:flex sm:max-w-3xl sm:justify-between md:gap-10">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-2">
              <h3 className="text-sm uppercase tracking-wider text-white/50 md:text-base">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-1">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link to={link.href} className={linkCls}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className={linkCls}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm uppercase tracking-wider text-white/50 md:text-base">
              Social
            </h3>
            <ul className="flex flex-col gap-2 md:gap-2.5">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                    className="flex items-center gap-2 text-base text-white/80 transition-colors hover:text-white md:text-lg"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {showLogo && (
          <img
            src="/music-atlas-moving-logo.gif"
            alt="Music Atlas"
            loading="lazy"
            className="h-20 w-auto flex-shrink-0 md:h-32"
          />
        )}
      </div>
      <div className="mt-8 border-t border-white/15 pt-4 md:mt-10 md:pt-6">
        <span className="text-sm text-white/50 md:text-base">
          ©2026 Music Atlas IO
        </span>
      </div>
    </footer>
  );
};
