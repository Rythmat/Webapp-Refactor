/**
 * IdeaBankDrawer — the browsable reference drawer (recurring formats, the
 * 7-slide spotlight template, cross-cutting themes, content threads, activity
 * types, anthem bank). Pure inspiration: browse + copy-to-clipboard, no apply.
 */
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { IDEA_BANK } from '../content';

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy — clipboard blocked');
  }
};

const CopyButton = ({ text }: { text: string }) => (
  <button
    type="button"
    onClick={() => copyText(text)}
    aria-label="Copy"
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white"
  >
    <Copy className="h-3.5 w-3.5" />
  </button>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs uppercase tracking-wider text-white/40">{children}</h3>
);

interface IdeaBankDrawerProps {
  onClose: () => void;
}

export const IdeaBankDrawer = ({ onClose }: IdeaBankDrawerProps) => {
  const ib = IDEA_BANK;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col gap-5 overflow-y-auto border-l border-white/10 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 -mx-5 -mt-5 flex items-center justify-between bg-neutral-950/90 px-5 py-3 backdrop-blur">
          <span className="text-sm font-medium text-white">Idea Bank</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recurring formats */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Recurring formats</SectionTitle>
          {ib.recurringFormats.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-white">
                  {f.title}
                </span>
                <CopyButton text={`${f.title}\n${f.description}`} />
              </div>
              <p className="text-xs text-white/60">{f.description}</p>
              {f.createOptions.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-white/50">
                  {f.createOptions.map((o) => (
                    <li key={o} className="flex gap-2">
                      <span className="text-white/25">→</span>
                      {o}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {/* Spotlight template */}
        <section className="flex flex-col gap-2">
          <SectionTitle>{ib.slideDeckTemplate.title}</SectionTitle>
          <ol className="flex flex-col gap-1.5">
            {ib.slideDeckTemplate.slides.map((s) => (
              <li
                key={s.slide}
                className="flex gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs"
              >
                <span className="text-white/30">{s.slide}.</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-white/80">{s.title}</span>
                  <span className="text-white/50">{s.content}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Cross-cutting themes */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Cross-cutting themes</SectionTitle>
          {ib.crossCuttingThemes.map((c) => (
            <div key={c.category} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/70">
                {c.category}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {c.items.map((it) => (
                  <span
                    key={it}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-0.5 text-[11px] text-white/60"
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Content threads */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Content threads</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {ib.contentThreads.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-0.5 text-[11px] text-white/60"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Activity types */}
        <section className="flex flex-col gap-2">
          <SectionTitle>Activity types</SectionTitle>
          <ul className="flex flex-col gap-1.5">
            {ib.activityTypes.map((a) => (
              <li key={a.name} className="text-xs">
                <span className="font-medium text-white/80">{a.name}</span>
                <span className="text-white/50"> — {a.description}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Anthem bank */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Anthem bank</SectionTitle>
            <CopyButton text={ib.anthemBank.songs.join('\n')} />
          </div>
          <p className="text-xs italic text-white/50">{ib.anthemBank.prompt}</p>
          <ul className="flex flex-col gap-1 text-xs text-white/60">
            {ib.anthemBank.songs.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-white/25">♪</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
