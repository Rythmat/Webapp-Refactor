/* eslint-disable react/jsx-sort-props */
import { Loader2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { grooveIdFrom } from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  CUSTOM_DRUM_KITS,
  DRUM_KITS,
  DRUM_PADS,
  padLabel,
  type CustomDrumKitFile,
} from '@/daw/instruments/drumKits';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import {
  CAN_WRITE_FILES,
  listUploadedSamples,
  saveKitFile,
  uploadSample,
} from './devFiles';

const STOCK = ['natural', '808', 'house'];

/** A sample URL's file name without the upload's time prefix. */
const sampleName = (url: string) =>
  decodeURIComponent(url.split('/').pop() ?? url).replace(/^[a-z0-9]+-/, '');

function playUrl(url: string) {
  void Tone.start().then(() => {
    const player = new Tone.Player(url, () => {
      player.start();
      player.onstop = () => player.dispose();
    }).toDestination();
  });
}

interface Props {
  kit: string;
  onKit: (kit: string) => void;
  /** The custom kit being built, auditioned before it is saved. */
  customKit: CustomDrumKitFile | null;
  onCustomKit: (kit: CustomDrumKitFile | null) => void;
  onError: (message: string) => void;
}

/**
 * Pick the groove's kit, or build a custom one: a stock kit with some pads
 * swapped for uploaded samples. Saved kits appear in every kit menu — lessons,
 * Practice Tracks and the Studio's drum machine.
 */
export const KitPanel: FC<Props> = ({
  kit,
  onKit,
  customKit,
  onCustomKit,
  onError,
}) => {
  const [uploads, setUploads] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedKits, setSavedKits] = useState<CustomDrumKitFile[]>([
    ...CUSTOM_DRUM_KITS,
  ]);
  const uploadPad = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!CAN_WRITE_FILES) return;
    listUploadedSamples()
      .then(setUploads)
      .catch(() => setUploads([]));
  }, []);

  const kitOptions = [
    ...DRUM_KITS.filter((k) => !savedKits.some((s) => s.id === k.id)),
    ...savedKits.map((k) => ({ id: k.id, label: k.label })),
  ];

  const startCustom = () => {
    const existing = savedKits.find((k) => k.id === kit);
    onCustomKit(
      existing
        ? { ...existing, samples: { ...existing.samples } }
        : {
            id: grooveIdFrom(`custom ${kit}`),
            label: `Custom ${kit}`,
            base: STOCK.includes(kit) ? kit : 'natural',
            samples: {},
          },
    );
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pad = uploadPad.current;
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !customKit || pad === null) return;
    setBusy(true);
    try {
      const url = await uploadSample(file);
      setUploads((u) => [url, ...u]);
      onCustomKit({
        ...customKit,
        samples: { ...customKit.samples, [pad]: url },
      });
      playUrl(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const saveKit = async () => {
    if (!customKit) return;
    const id = grooveIdFrom(customKit.id);
    if (STOCK.includes(id)) {
      onError(`"${id}" is a stock kit's id — pick another.`);
      return;
    }
    setBusy(true);
    try {
      const file = { ...customKit, id };
      await saveKitFile(file);
      setSavedKits((ks) => [...ks.filter((k) => k.id !== id), file]);
      onCustomKit(file);
      onKit(id);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(CONSOLE_PANEL, 'p-4')}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className={CONSOLE_LABEL}>Kit</h3>
        <select
          value={kit}
          onChange={(e) => {
            onKit(e.target.value);
            onCustomKit(null);
          }}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
          aria-label="Kit"
        >
          {kitOptions.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
          {customKit && !kitOptions.some((k) => k.id === customKit.id) && (
            <option value={customKit.id}>{customKit.label} (unsaved)</option>
          )}
        </select>
        {!customKit && CAN_WRITE_FILES && (
          <Button size="sm" variant="outline" onClick={startCustom}>
            {savedKits.some((k) => k.id === kit)
              ? 'Edit this kit'
              : 'Customise with your own samples'}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          A step&rsquo;s own kit (backing_style.kit) still wins over this.
        </span>
      </div>

      {customKit && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              value={customKit.label}
              onChange={(e) =>
                onCustomKit({
                  ...customKit,
                  label: e.target.value,
                  id: savedKits.some((k) => k.id === customKit.id)
                    ? customKit.id
                    : grooveIdFrom(e.target.value),
                })
              }
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
              aria-label="Kit name"
            />
            <span className="tabular-nums text-xs text-white/40">
              {customKit.id}
            </span>
            <label className="flex items-center gap-1 text-xs text-white/60">
              based on
              <select
                value={customKit.base}
                onChange={(e) =>
                  onCustomKit({ ...customKit, base: e.target.value })
                }
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
              >
                {STOCK.map((id) => (
                  <option key={id} value={id}>
                    {DRUM_KITS.find((k) => k.id === id)?.label ?? id}
                  </option>
                ))}
              </select>
            </label>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCustomKit(null)}
              >
                Close
              </Button>
              <Button size="sm" onClick={saveKit} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Save kit
              </Button>
            </div>
          </div>

          {DRUM_PADS.map((pad) => {
            const url = customKit.samples[pad.note];
            return (
              <div key={pad.note} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                  {padLabel(pad.note, customKit.base)}
                </span>
                <select
                  value={url ?? ''}
                  onChange={(e) => {
                    const samples = { ...customKit.samples };
                    if (e.target.value) samples[pad.note] = e.target.value;
                    else delete samples[pad.note];
                    onCustomKit({ ...customKit, samples });
                  }}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1"
                  aria-label={`${pad.label} sample`}
                >
                  <option value="">
                    {DRUM_KITS.find((k) => k.id === customKit.base)?.label}{' '}
                    kit&rsquo;s own
                  </option>
                  {[...new Set([...(url ? [url] : []), ...uploads])].map(
                    (u) => (
                      <option key={u} value={u}>
                        ⬆ {sampleName(u)}
                      </option>
                    ),
                  )}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    uploadPad.current = pad.note;
                    fileRef.current?.click();
                  }}
                >
                  <Upload /> Upload
                </Button>
                {url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => playUrl(url)}
                  >
                    Hear
                  </Button>
                )}
              </div>
            );
          })}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={onUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">
            One-shots up to 5MB. Uploads go to
            public/daw-assets/samples/drums/uploads/ — commit them with the kit.
          </p>
        </div>
      )}
    </section>
  );
};
