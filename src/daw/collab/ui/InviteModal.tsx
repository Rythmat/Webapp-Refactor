// ── InviteModal ──────────────────────────────────────────────────────────
// Modal for inviting collaborators by username search or via link.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Search, Send, UserPlus, X } from 'lucide-react';
import SuperJSON from 'superjson';
import { useStore } from '@/daw/store/index';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { Env } from '@/constants/env';
import { showSuccess, showError } from '@/util/toast';
import type { CollabRole } from '../types';

interface SearchResult {
  id: string;
  nickname: string;
  username: string | null;
}

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const roomId = useStore((s) => s.roomId);
  const { token, appUser } = useAuthContext();
  const [selectedRole, setSelectedRole] = useState<CollabRole>('editor');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const apiBase =
          Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
        const res = await fetch(
          `${apiBase}/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const data = SuperJSON.parse(await res.text()) as SearchResult[];
          setResults(data);
        } else {
          console.error(`[InviteModal] Search failed: ${res.status}`);
          showError(`Search failed (${res.status})`);
        }
      } catch (err) {
        console.error('[InviteModal] Search error:', err);
        showError('Search unavailable');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, token]);

  // Send invite to a user
  const handleInvite = useCallback(
    async (user: SearchResult) => {
      if (!roomId || !token || sending) return;
      setSending(user.id);
      try {
        const res = await fetch(`/api/collab/rooms/${roomId}/invite-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetUserId: user.id,
            targetUserName: appUser?.nickname ?? 'Someone',
            role: selectedRole,
          }),
        });

        if (res.ok) {
          showSuccess(`Invited ${user.nickname} as ${selectedRole}`);
          // Remove from results so they can't be invited again
          setResults((prev) => prev.filter((r) => r.id !== user.id));
        } else {
          const data = await res.json().catch(() => ({}));
          showError(
            (data as { error?: string }).error ?? 'Failed to send invite',
          );
        }
      } catch {
        showError('Failed to send invite');
      } finally {
        setSending(null);
      }
    },
    [roomId, token, selectedRole, sending, appUser],
  );

  // Copy invite link fallback
  const inviteUrl = roomId
    ? `${window.location.origin}/studio/join?room=${roomId}&role=${selectedRole}`
    : '';

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onKeyDown={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 z-50 flex w-[380px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus
                  size={14}
                  strokeWidth={2}
                  style={{ color: 'var(--color-accent)' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Invite Collaborators
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/10"
                style={{
                  color: 'var(--color-text-dim)',
                  background: 'none',
                  border: 'none',
                }}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Permission
              </span>
              <div className="flex gap-1.5">
                {(['editor', 'viewer'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className="flex-1 rounded-md py-1.5 text-[10px] font-medium capitalize transition-colors"
                    style={{
                      backgroundColor:
                        selectedRole === role
                          ? 'var(--color-accent)'
                          : 'var(--color-surface)',
                      color:
                        selectedRole === role
                          ? '#fff'
                          : 'var(--color-text-dim)',
                      border: 'none',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* User search */}
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Search by name
              </span>
              <div
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <Search
                  size={12}
                  style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a username or nickname..."
                  className="flex-1 border-none bg-transparent text-[11px] outline-none"
                  style={{ color: 'var(--color-text)' }}
                />
              </div>

              {/* Search results */}
              {(results.length > 0 || searching) && (
                <div
                  className="flex max-h-[160px] flex-col gap-0.5 overflow-y-auto rounded-md p-1"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  {searching && results.length === 0 && (
                    <div
                      className="px-2 py-2 text-center text-[10px]"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      Searching...
                    </div>
                  )}
                  {results.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
                    >
                      <div className="flex flex-col">
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {user.nickname}
                        </span>
                        {user.username && (
                          <span
                            className="text-[9px]"
                            style={{ color: 'var(--color-text-dim)' }}
                          >
                            @{user.username}
                          </span>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleInvite(user)}
                        disabled={sending === user.id}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: '#fff',
                          border: 'none',
                          opacity: sending === user.id ? 0.5 : 1,
                        }}
                      >
                        <Send size={9} />
                        {sending === user.id ? 'Sending...' : 'Invite'}
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
              {query.length >= 2 && !searching && results.length === 0 && (
                <div
                  className="px-2 py-2 text-center text-[10px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  No users found
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              className="h-px w-full"
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            {/* Invite link fallback */}
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Or share a link
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  value={inviteUrl}
                  readOnly
                  className="flex-1 rounded-md border-none px-2 py-1.5 text-[10px] outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                />
                <motion.button
                  onClick={handleCopy}
                  whileTap={{ scale: 0.9 }}
                  className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
                  style={{
                    color: copied ? '#22c55e' : 'var(--color-text-dim)',
                    background: 'none',
                    border: 'none',
                  }}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check size={12} strokeWidth={2.5} />
                  ) : (
                    <Copy size={12} strokeWidth={2} />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
