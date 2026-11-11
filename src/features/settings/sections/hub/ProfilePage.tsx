import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarEditor } from '@/components/Profile/AvatarEditor';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import { type AvatarConfig, defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { showError, showSuccess } from '@/util/toast';
import {
  ACCOUNT_INPUT,
  ACCOUNT_PILL,
  ACCOUNT_PILL_DANGER,
  ACCOUNT_PILL_PRIMARY,
  AccountField,
  AccountPage,
  AccountSection,
  SettingsGroup,
  SettingsRow,
} from '../../ui/accountKit';

// ── Account › Profile (owner, 2026-11-10: samply.app/profile's) ────────────
// Who the student is: their photo (the hex avatar, changed in the editor the
// User page used to hold), their name and email as their sign-in has them,
// then Account management: a new password, and leaving. Name and email have
// no way to change yet (no API), so they show as they are, with no button
// that wouldn't work. A password is reset on Auth0's sign-in screen (the
// app's own reset is a stub), so that row says so and signs out to it;
// deleting an account goes to support, who do it.

const SUPPORT = 'aaron@musicatlas.io';

/** The avatar editor, in a dialog: Save writes it, as the User page did. */
function AvatarDialog({
  open,
  onOpenChange,
  saved,
  fallbackName,
  canSave,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: AvatarConfig | undefined;
  fallbackName: string;
  canSave: boolean;
  onSave: (config: AvatarConfig) => boolean;
}) {
  const [editing, setEditing] = useState<AvatarConfig | undefined>(saved);
  useEffect(() => {
    if (open) setEditing(saved);
  }, [open, saved]);
  const config = editing ?? saved ?? defaultAvatarConfig(fallbackName);
  const changed = JSON.stringify(config) !== JSON.stringify(saved);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[29.09rem] rounded-xl border-white/[0.08] bg-[#1b1b1f] p-[1.364rem] text-white">
        <DialogTitle className="text-[1.136rem] font-semibold">
          Photo
        </DialogTitle>
        <DialogDescription className="text-[0.795rem] text-white/[0.48]">
          Your avatar across Music Atlas.
        </DialogDescription>
        <div className="flex flex-col items-center gap-[1.364rem]">
          <UserAvatarPattern
            className="size-[5.455rem] rounded-full"
            userName={fallbackName}
            config={config}
          />
          <div className="w-full">
            <AvatarEditor value={config} onChange={setEditing} />
          </div>
          <div className="flex w-full justify-end gap-[0.455rem]">
            <button
              type="button"
              className={ACCOUNT_PILL}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!changed || !canSave}
              className={cn(ACCOUNT_PILL, ACCOUNT_PILL_PRIMARY)}
              onClick={() => {
                if (onSave(config)) {
                  showSuccess('Photo saved');
                  onOpenChange(false);
                } else {
                  showError('Could not save your photo — please try again.');
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ProfilePage = () => {
  const { data: user } = useMe();
  const name = user?.nickname || user?.username || '';
  const { config: saved, saveConfig } = useAvatarConfig(
    user?.id,
    (user as Record<string, unknown> | undefined)?.avatarConfig,
  );
  const [editing, setEditing] = useState(false);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  return (
    <AccountPage title="Profile">
      <div className="flex flex-col gap-[0.909rem]">
        <AccountField label="Photo">
          <span className="block size-[5.455rem] shrink-0 overflow-hidden rounded-full border border-white/[0.08]">
            <UserAvatarPattern
              className="size-full"
              userName={name || 'friend'}
              config={saved}
            />
          </span>
          <button
            type="button"
            className={ACCOUNT_PILL}
            onClick={() => setEditing(true)}
          >
            Update
          </button>
        </AccountField>
        <AccountField label="Name" htmlFor="account-name">
          <input
            id="account-name"
            readOnly
            value={name}
            placeholder="Not set"
            className={ACCOUNT_INPUT}
          />
        </AccountField>
        <AccountField label="Email" htmlFor="account-email">
          <input
            id="account-email"
            readOnly
            value={user?.email ?? ''}
            className={ACCOUNT_INPUT}
          />
        </AccountField>
      </div>

      <AccountSection
        title="Account management"
        description="Secure your account and manage your data"
        spacing="cards"
      >
        <SettingsGroup>
          <SettingsRow
            title="Reset password"
            description="Passwords are reset from the sign-in screen: sign out, then choose “Forgot password?”."
            action={
              <button
                type="button"
                className={ACCOUNT_PILL}
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            }
          />
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow
            title="Delete account"
            description="Permanently delete your Music Atlas account."
            action={
              <a
                href={`mailto:${SUPPORT}?subject=${encodeURIComponent('Delete my Music Atlas account')}`}
                className={cn(ACCOUNT_PILL, ACCOUNT_PILL_DANGER)}
              >
                Delete account
              </a>
            }
          />
        </SettingsGroup>
      </AccountSection>

      <AvatarDialog
        open={editing}
        onOpenChange={setEditing}
        saved={saved ?? undefined}
        fallbackName={name || 'friend'}
        canSave={!!user?.id}
        onSave={saveConfig}
      />
    </AccountPage>
  );
};
