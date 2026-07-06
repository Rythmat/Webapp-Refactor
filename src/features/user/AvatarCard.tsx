/* eslint-disable react/jsx-sort-props */
import { useEffect, useState } from 'react';
import { AvatarEditor } from '@/components/Profile/AvatarEditor';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import { type AvatarConfig, defaultAvatarConfig } from '@/lib/avatarHexGrid';

/**
 * Avatar card for the User page — preview circle + display-name pill + the
 * inline AvatarEditor. Edits auto-persist (~500 ms debounce) via useAvatarConfig.
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

  useEffect(() => {
    if (!editingConfig) return;
    const t = setTimeout(() => saveAvatarConfig(editingConfig), 500);
    return () => clearTimeout(t);
  }, [editingConfig, saveAvatarConfig]);

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
        <div className="flex flex-col items-center gap-4">
          <div
            className="size-40 overflow-hidden rounded-full shadow-2xl"
            style={{ border: '4px solid var(--color-accent)' }}
          >
            <Avatar className="size-full rounded-full">
              <AvatarFallback className="relative overflow-hidden p-0">
                <UserAvatarPattern
                  className="size-full"
                  userName={displayName}
                  config={activeConfig}
                />
              </AvatarFallback>
            </Avatar>
          </div>
          <div
            className="rounded-full px-4 py-2 text-lg backdrop-blur-sm"
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {displayName}
          </div>
        </div>
        <div className="mt-6">
          <AvatarEditor value={activeConfig} onChange={setEditingConfig} />
        </div>
      </div>
    </section>
  );
};
