/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string;
  currentName?: string;
}

export const EditAccountModal = ({
  open,
  onOpenChange,
  currentEmail = '',
  currentName = '',
}: EditAccountModalProps) => {
  const [fullName, setFullName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      // Call API to update profile (not yet implemented)
      // await musicAtlas.auth.updateProfile({ fullName, email, currentPassword, newPassword });
      onOpenChange(false);
    } catch {
      setError('Failed to update account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#2d2d2d] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-[#D4A843]">Edit Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-shade-5/60 border-white/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-shade-5/60 border-white/10"
            />
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Leave password fields blank to keep your current password.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-shade-5/60 border-white/10"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-shade-5/60 border-white/10"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-shade-5/60 border-white/10"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#4A9ECC] hover:bg-[#3A8EBC] text-white font-bold uppercase text-xs tracking-wider"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
