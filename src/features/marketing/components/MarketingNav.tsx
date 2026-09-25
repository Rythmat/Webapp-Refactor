import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { MagneticButton } from '@/features/landing/motion/MagneticButton';
import {
  LOGIN_HREF,
  navLinks,
  productLinks,
  START_FREE_HREF,
} from '../content/nav';

/** Nav link with an underline that grows in from the left on hover/focus. */
const linkCls = cn(
  'relative text-[15px] font-medium text-white/70 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none',
  'after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-white/70 after:transition-transform after:duration-300',
  'hover:after:scale-x-100 focus-visible:after:scale-x-100',
);

/**
 * Sticky marketing nav, shared by the landing (`/`) and every `/features/*`
 * page. Transparent over the hero, then a blurred glass bar once the window
 * scrolls (Linear-style). Logo + wordmark left; a Product mega-menu (module
 * pages; neutral white — color is reserved for the music color system), Blog &
 * For Teachers, Log in and
 * a magnetic "Start free" CTA right. Collapses to an animated drawer on mobile;
 * the Start free CTA stays visible.
 *
 * `solid` forces the glass bar on regardless of scroll. `fluid` stretches the
 * row to the viewport's edge padding; the default centres it in `max-w-6xl`.
 */
export const MarketingNav = ({
  solid = false,
  fluid = false,
}: { solid?: boolean; fluid?: boolean } = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const showSolid = solid || scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300',
        showSolid
          ? 'border-white/[0.06] bg-[#101012]/70 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-transparent',
      )}
    >
      <nav
        aria-label="Main"
        className={cn(
          'flex h-16 w-full items-center justify-between gap-4',
          fluid ? 'px-5 md:px-10' : 'mx-auto max-w-6xl px-5 sm:px-8',
        )}
      >
        <Link
          to="/"
          aria-label="Music Atlas home"
          className="group flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Logo className="h-6 w-auto text-white transition-transform duration-500 group-hover:rotate-[20deg]" />
          <span className="text-lg font-semibold tracking-tight text-white">
            Music Atlas
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={cn(
                linkCls,
                'group inline-flex items-center gap-1 outline-none data-[state=open]:text-white',
              )}
            >
              Product
              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={14}
              className="grid w-[30rem] grid-cols-2 gap-1 rounded-2xl border-white/10 bg-[#141416]/90 p-2 text-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            >
              {productLinks.map(({ href, label, description, Icon }) => (
                <DropdownMenuItem
                  key={href}
                  asChild
                  className="cursor-pointer rounded-xl p-3 focus:bg-white/[0.06] focus:text-white"
                >
                  <Link to={href} className="group/item flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white transition-transform duration-200 group-hover/item:scale-110 [&_svg]:size-[18px]">
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {label}
                      </span>
                      <span className="block text-xs leading-snug text-white/55">
                        {description}
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
          <span aria-hidden className="h-5 w-px bg-white/10" />
          <Link to={LOGIN_HREF} className={linkCls}>
            Log in
          </Link>
          <MagneticButton
            to={START_FREE_HREF}
            tone="light"
            size="sm"
            strength={4}
          >
            Start free
          </MagneticButton>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <MagneticButton
            to={START_FREE_HREF}
            tone="light"
            size="sm"
            strength={0}
          >
            Start free
          </MagneticButton>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="marketing-mobile-menu"
            key="drawer"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <ul className="flex max-h-[calc(100svh-4rem)] flex-col gap-1 overflow-y-auto px-5 py-4">
              {productLinks.map(({ href, label, description, Icon }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="flex items-center gap-3 rounded-xl px-2 py-3 text-white/85 hover:bg-white/5 hover:text-white"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white [&_svg]:size-[18px]">
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-base font-medium">
                        {label}
                      </span>
                      <span className="block text-xs text-white/50">
                        {description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              <li aria-hidden className="my-2 h-px bg-white/10" />
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="flex items-center justify-between rounded-xl px-2 py-3 text-base text-white/85 hover:bg-white/5 hover:text-white"
                  >
                    {l.label}
                    <ArrowRight className="size-4 text-white/40" />
                  </Link>
                </li>
              ))}
              <li className="mt-2">
                <Link
                  to={LOGIN_HREF}
                  className="flex h-11 items-center justify-center rounded-full border border-white/15 text-base font-medium text-white hover:bg-white/10"
                >
                  Log in
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
