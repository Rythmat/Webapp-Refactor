/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */

const HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--color-text)',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const BTN_ACCENT: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#111',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const HELP_LINKS = [
  { label: 'Get Started with Music Atlas', href: '#' },
  { label: 'Connecting your instrument', href: '#' },
  { label: 'Audio latency setup', href: '#' },
  { label: 'Music Atlas app settings', href: '#' },
  { label: 'How to manage your subscription', href: '#' },
  { label: 'Beginners guide to Keys', href: '#' },
];

export const HelpPanel = () => {
  return (
    <>
      <h2 style={HEADING}>Need help?</h2>
      <div className="glass-panel-sm space-y-4" style={PANEL}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text)',
          }}
        >
          Quick Answers to the Most Common Topics
        </p>
        <div>
          {HELP_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3 text-sm transition-colors"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#a8e4e4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <p
            className="mb-3 text-sm"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Couldn't spot what you were looking for?
          </p>
          <button
            type="button"
            style={BTN_ACCENT}
            onClick={() => window.open('#', '_blank')}
          >
            Visit Support Center
          </button>
        </div>
      </div>
    </>
  );
};
