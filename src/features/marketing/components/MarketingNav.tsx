import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import {
  LOGIN_HREF,
  navLinks,
  productLinks,
  START_FREE_HREF,
} from '../content/nav';

const linkCls =
  'text-base font-medium text-white transition-colors hover:text-white/80';

/**
 * Sticky marketing nav — logo + wordmark, a Product dropdown (module pages), Blog
 * & For Teachers links, and white Log in / Start free CTAs. Collapses to a drawer
 * on mobile; the Start free CTA stays visible.
 *
 * `fluid` stretches the row to the viewport's edge padding (`px-6 md:px-10`) so the
 * logo/CTAs line up with a full-width page like the landing; the default centres the
 * row in a `max-w-6xl` column to match the marketing site's content.
 */
export const MarketingNav = ({
  solid = false,
  fluid = false,
}: { solid?: boolean; fluid?: boolean } = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // `solid` forces the backdrop on (used on the landing, which scrolls in an
  // inner container so the window-scroll transition can't fire).
  const showSolid = solid || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        showSolid
          ? 'border-b border-white/[0.08] bg-[#0b0b0d]/85 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <nav
        className={cn(
          'flex h-24 w-full items-center justify-between gap-4',
          fluid ? 'px-6 md:px-10' : 'mx-auto max-w-6xl px-5 sm:px-8',
        )}
      >
        <Link
          to="/"
          aria-label="Music Atlas home"
          className="flex items-center gap-2"
        >
          <Logo className="h-7 w-auto text-white" />
          <span className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Music Atlas
          </span>
        </Link>

        {/* Desktop nav — logo alone left, all items grouped right (BandLab layout) */}
        <div className="hidden items-center gap-8 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                linkCls,
                'inline-flex items-center gap-1 outline-none',
              )}
            >
              Product <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 border-white/10 bg-[#141416] text-white"
            >
              {productLinks.map((l) => (
                <DropdownMenuItem
                  key={l.href}
                  asChild
                  className="cursor-pointer focus:bg-white/10 focus:text-white"
                >
                  <Link to={l.href}>
                    <span>
                      <span className="block text-sm font-medium">
                        {l.label}
                      </span>
                      <span className="block text-xs text-white/50">
                        {l.description}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <Link to={LOGIN_HREF} className={linkCls}>
            Log in
          </Link>
          <Button
            asChild
            className="h-9 rounded-full bg-white px-3 text-base font-medium text-black shadow-none hover:bg-white/90 active:bg-white/80"
          >
            <Link to={START_FREE_HREF}>Start free</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            asChild
            className="h-9 rounded-full bg-white px-3 text-base font-medium text-black shadow-none hover:bg-white/90 active:bg-white/80"
          >
            <Link to={START_FREE_HREF}>Start free</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-white/15 text-white"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-[#0b0b0d]/95 backdrop-blur-md md:hidden">
          <ul className="flex flex-col gap-1 px-5 py-4">
            {[...productLinks, ...navLinks].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Button
                asChild
                variant="ghost"
                className="w-full text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={LOGIN_HREF} onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};
