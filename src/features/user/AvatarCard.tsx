import { useEffect, useMemo, useState } from 'react';
import { AvatarEditor } from '@/components/Profile/AvatarEditor';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import {
  type AvatarConfig,
  defaultAvatarConfig,
  generateAvatarPolygons,
} from '@/lib/avatarHexGrid';
import { showError, showSuccess } from '@/util/toast';

const AVATAR_SVG_SIZE = 256;

/**
 * Serialise an avatar config into an inline `<svg>` honeycomb string so it can be
 * painted onto the interactive `HexWaveBackground` canvas (same approach as the
 * studio project tiles). Parsed inline by HexWaveBackground.
 */
function configToHexSvg(config: AvatarConfig): string {
  const { width, height, polygons } = generateAvatarPolygons(
    config,
    AVATAR_SVG_SIZE,
    AVATAR_SVG_SIZE,
  );
  const body = polygons
    .map(
      (p) =>
        `<polygon points="${p.points}" fill="${p.fill}" opacity="${p.opacity}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

/**
 * Avatar card for the User page — an interactive honeycomb preview (the same
 * paintable/ambient hex canvas used across the app) + display-name pill + the
 * inline AvatarEditor. Edits auto-persist (~500 ms debounce) via useAvatarConfig
 * and update the canvas live.
 */
export const AvatarCard = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || 'USER';

  const { config: savedAvatarConfig, saveConfig: saveAvatarConfig } =
    useAvatarConfig(
      user?.id,
      (user as Record<string, unknown> | undefined)?.avatarConfig,
    );

  const [editingConfig, setEditingConfig] = useState<AvatarConfig | undefined>(
    undefined,
  );

  useEffect(() => {
    if (savedAvatarConfig && !editingConfig) {
      setEditingConfig(savedAvatarConfig);
    }
  }, [savedAvatarConfig, editingConfig]);

  const activeConfig =
    editingConfig ?? savedAvatarConfig ?? defaultAvatarConfig(displayName);

  // Explicit save (no more silent debounce). The button enables only when the
  // live config differs from what's saved, and briefly shows "Saved ✓".
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const hasUnsavedChanges =
    JSON.stringify(activeConfig) !== JSON.stringify(savedAvatarConfig);

  const handleSave = () => {
    if (saveAvatarConfig(activeConfig)) {
      setJustSaved(true);
      showSuccess('Avatar saved');
    } else {
      // saveConfig no-ops without a resolved user id — surface it instead of
      // claiming success (which is what made this look like it "saved" then reverted).
      showError('Could not save your avatar — please try again.');
    }
  };

  const avatarSvg = useMemo(
    () => configToHexSvg(activeConfig),
    // Stable key across identical configs (activeConfig may be a fresh object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(activeConfig)],
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-medium text-white">Avatar</h2>
      <div
        className="glass-panel-sm relative rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          {/* Left: interactive avatar preview — 50% of the card */}
          <div
            className="relative aspect-square w-1/2 max-w-64 shrink-0 self-center overflow-hidden rounded-full shadow-2xl"
            style={{ border: '4px solid var(--color-accent)' }}
          >
            <HexWaveBackground
              src={avatarSvg}
              drain={false}
              ambient
              colorThreshold={0.05}
              brushRadius={40}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </div>
          {/* Right: edit controls + explicit save */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <AvatarEditor value={activeConfig} onChange={setEditingConfig} />
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || !user?.id}
              className="self-start rounded-full px-6 py-2 text-sm font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: '#06201f' }}
            >
              {justSaved && !hasUnsavedChanges ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
