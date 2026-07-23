import { Link } from 'react-router-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/components/utilities';

/**
 * Marketing CTA button. White outline (primary) or ghost (secondary) per the
 * app's white-accent decision. Resolves its target: `/path` → SPA Link,
 * `#anchor` / `http` / `mailto` → anchor.
 */
export const MarketingButton = ({
  href,
  children,
  tone = 'primary',
  size = 'lg',
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  tone?: 'primary' | 'ghost';
} & Pick<ButtonProps, 'size' | 'className'>) => {
  const isInternal = href.startsWith('/');
  const isExternal = href.startsWith('http');
  const toneClass =
    tone === 'primary'
      ? 'border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white'
      : 'text-white hover:bg-white/10 hover:text-white';
  const variant = tone === 'primary' ? 'outline' : 'ghost';

  return <Button
      asChild
      variant={variant}
      size={size}
      className={cn(toneClass, className)}
      {...rest}
    >
      {isInternal ? (
        <Link to={href}>{children}</Link>
      ) : (
        <a
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {children}
        </a>
      )}
    </Button>;
};
