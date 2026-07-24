import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MarketingHelmet } from '../components/MarketingHelmet';
import { MarketingSection } from '../components/MarketingSection';
import { Reveal } from '../components/Reveal';

const CATEGORIES = [
  'Tutorials',
  'Theory Guides',
  'For Teachers',
  'Community',
  'Product Updates',
] as const;

const CATEGORY_COLOR: Record<string, string> = {
  Tutorials: '#34d399',
  'Theory Guides': '#60a5fa',
  'For Teachers': '#f472b6',
  Community: '#a78bfa',
  'Product Updates': '#7ecfcf',
};

// PLACEHOLDER posts — replace with real content (or wire a CMS) before launch.
const FEATURED = {
  category: 'Theory Guides',
  title: 'Learn music by making it: our approach',
  excerpt:
    'Why understanding and creating belong together — and how Music Atlas is built around that idea.',
  readTime: '5 min read',
};

const POSTS = [
  {
    category: 'Theory Guides',
    title: 'How the circle of fifths actually works',
    excerpt:
      'A friendly tour of the wheel that unlocks keys, chords and modes.',
    readTime: '6 min',
  },
  {
    category: 'Tutorials',
    title: '5 warmups to build finger independence',
    excerpt: 'Short daily drills you can do before every practice session.',
    readTime: '4 min',
  },
  {
    category: 'For Teachers',
    title: 'Running your first live Music Atlas class',
    excerpt:
      'Set up a roster, run a synced session, and assign work — step by step.',
    readTime: '7 min',
  },
  {
    category: 'Community',
    title: 'Meet the makers: tracks from the community',
    excerpt: 'A round-up of what learners and creators are making this month.',
    readTime: '3 min',
  },
  {
    category: 'Product Updates',
    title: 'What’s new: Studio gets a Score view',
    excerpt:
      'Turn your ideas into notation and lead sheets, right inside Studio.',
    readTime: '2 min',
  },
  {
    category: 'Tutorials',
    title: 'From zero to your first song in a week',
    excerpt: 'A simple 7-day plan that takes you from idea to finished track.',
    readTime: '8 min',
  },
];

const CategoryChip = ({ label }: { label: string }) => {
  const color = CATEGORY_COLOR[label] ?? '#ffffff';
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, background: `${color}1f` }}
    >
      {label}
    </span>
  );
};

const ComingSoon = () => (
  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium text-white/45">
    Coming soon
  </span>
);

export const BlogPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <>
      <MarketingHelmet
        title="Blog — Tutorials, theory guides & updates | Music Atlas"
        description="Tutorials, theory guides, teacher resources and product updates from Music Atlas."
        canonicalPath="/blog"
      />

      {/* Featured post */}
      <section className="px-6 pb-8 pt-32 sm:pt-36 md:px-10">
        <div className="w-full">
          <Reveal className="mb-6 flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Blog
            </h1>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/50">
              Sample posts — real content coming soon
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <article className="grid overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] lg:grid-cols-2">
              <div
                className="min-h-[220px]"
                style={{
                  background: `linear-gradient(135deg, ${CATEGORY_COLOR[FEATURED.category]}33, transparent 70%)`,
                }}
                aria-hidden
              />
              <div className="flex flex-col justify-center gap-4 p-8">
                <div className="flex items-center gap-2">
                  <CategoryChip label={FEATURED.category} />
                  <ComingSoon />
                </div>
                <h2 className="max-w-2xl text-2xl font-semibold text-white md:text-3xl">
                  {FEATURED.title}
                </h2>
                <p className="max-w-2xl text-white/70">{FEATURED.excerpt}</p>
                <span className="text-sm text-white/40">
                  {FEATURED.readTime}
                </span>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Category filter (visual) */}
      <MarketingSection className="!py-6">
        <Reveal className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
            All
          </span>
          {CATEGORIES.map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60"
            >
              {c}
            </span>
          ))}
        </Reveal>
      </MarketingSection>

      {/* Post grid */}
      <MarketingSection className="!pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post, i) => (
            <Reveal key={post.title} delay={i * 0.04}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div
                  className="mb-1 h-28 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${CATEGORY_COLOR[post.category]}33, transparent 70%)`,
                  }}
                  aria-hidden
                />
                <div className="flex items-center gap-2">
                  <CategoryChip label={post.category} />
                  <ComingSoon />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {post.title}
                </h3>
                <p className="text-sm text-white/70">{post.excerpt}</p>
                <span className="mt-auto text-xs text-white/40">
                  {post.readTime}
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Newsletter */}
      <MarketingSection>
        <Reveal>
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Free theory in your inbox
            </h2>
            <p className="mx-auto mt-2 max-w-md text-white/60">
              Get a weekly lesson and product updates. No spam.
            </p>
            {sent ? (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-[#34d399]">
                <Check className="size-4" /> You’re subscribed — check your
                inbox.
              </p>
            ) : (
              <form
                className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSent(true);
                }}
              >
                <label htmlFor="blog-newsletter" className="sr-only">
                  Email address
                </label>
                <input
                  id="blog-newsletter"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-11 flex-1 rounded-full border border-white/15 bg-[#0b0b0d] px-4 text-white outline-none placeholder:text-white/40 focus-visible:border-white/60"
                />
                <Button
                  type="submit"
                  size="lg"
                  variant="outline"
                  className="border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
                >
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </Reveal>
      </MarketingSection>
    </>
  );
};
