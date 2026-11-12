import { ArrowUpRight } from 'lucide-react';
import {
  ACCOUNT_PILL,
  AccountSubheading,
  SettingsGroup,
  SettingsRow,
} from '../ui/accountKit';

// Not yet real: the topics and the Support Center have no pages (every link is
// '#'); point them at the real articles once they exist.
const HELP_LINKS = [
  { label: 'Get Started with Music Atlas', href: '#' },
  { label: 'Connecting your instrument', href: '#' },
  { label: 'Audio latency setup', href: '#' },
  { label: 'Music Atlas app settings', href: '#' },
  { label: 'How to manage your subscription', href: '#' },
  { label: 'Beginners guide to Keys', href: '#' },
];

/**
 * Help, in the Account area's look (owner, 2026-11-10): the common topics as
 * rows that open in a new tab, then the Support Center; grey, no teal.
 */
export const HelpPanel = () => (
  <>
    <AccountSubheading>Common topics</AccountSubheading>
    <SettingsGroup>
      {HELP_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 p-[0.909rem] text-[0.795rem] leading-[1.136rem] text-white transition-colors hover:bg-white/[0.04]"
        >
          {link.label}
          <ArrowUpRight aria-hidden className="size-[0.909rem] text-white/50" />
        </a>
      ))}
    </SettingsGroup>
    <SettingsGroup>
      <SettingsRow
        plain
        title="Couldn't spot what you were looking for?"
        action={
          <button
            type="button"
            className={ACCOUNT_PILL}
            onClick={() => window.open('#', '_blank')}
          >
            Visit Support Center
          </button>
        }
      />
    </SettingsGroup>
  </>
);
