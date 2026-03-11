/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import {
  Activity,
  ChevronRight,
  Mic2,
  Music,
  Pencil,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { AccountSettings } from '@/features/settings/sections/AccountSettings';
import { AudioSettings } from '@/features/settings/sections/AudioSettings';
import { ContentCodesSettings } from '@/features/settings/sections/ContentCodesSettings';
import { HelpPanel } from '@/features/settings/sections/HelpPanel';
import { LookAndFeelSettings } from '@/features/settings/sections/LookAndFeelSettings';
import { MidiSettings } from '@/features/settings/sections/MidiSettings';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { UserAvatarPattern } from '../ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { AvatarEditorModal } from './AvatarEditorModal';
import '@/features/settings/settings.css';

const TABS = ['Profile', 'General', 'Account', 'Codes'] as const;
type Tab = (typeof TABS)[number];

interface TagProps {
  label: string;
  icon?: React.ElementType;
}

const Tag: React.FC<TagProps> = ({ label, icon: Icon }) => (
  <div
    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
    style={{
      border: '1px solid var(--color-border)',
      background: 'rgba(255,255,255,0.05)',
      color: 'var(--color-text-dim)',
    }}
  >
    {Icon && <Icon size={10} />}
    {label}
  </div>
);

export const ProfilePage: React.FC = () => {
  const { data: user } = useMe();
  const navigate = useNavigate();
  const displayName = user?.nickname || user?.username || 'USER';
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const { config: savedAvatarConfig, saveConfig: saveAvatarConfig } =
    useAvatarConfig(user?.id);

  return (
    <div
      className="settings-root relative flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <HeaderBar
        className="bg-neutral-900/60"
        showProfile={false}
        title="Settings"
      />

      <div className="relative flex flex-1 flex-col overflow-y-auto px-8 pb-12">
        <div className="w-full space-y-6">
          {/* Tab bar + close button */}
          <div className="relative flex items-center justify-center">
            <div
              className="glass-panel-sm flex w-fit items-center gap-1 rounded-lg p-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className="rounded-md px-6 py-2 text-sm font-medium transition-colors duration-150"
                  style={
                    activeTab === tab
                      ? {
                          background: 'var(--color-surface-3)',
                          color: 'var(--color-accent)',
                          borderBottom: '2px solid var(--color-accent)',
                        }
                      : {
                          color: 'var(--color-text-dim)',
                          background: 'transparent',
                          borderBottom: '2px solid transparent',
                        }
                  }
                  onClick={() => setActiveTab(tab)}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = 'var(--color-text)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = 'var(--color-text-dim)';
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute right-0 flex size-8 items-center justify-center rounded-full transition-colors"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'Profile' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                <div className="flex flex-col items-center justify-center lg:col-span-5">
                  <div
                    className="mb-4 rounded-full px-4 py-2 text-center font-serif text-lg backdrop-blur-sm"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {displayName}
                  </div>
                  <div className="relative mb-6 size-80">
                    <div
                      className="size-full overflow-hidden rounded-full shadow-2xl"
                      style={{ border: '4px solid var(--color-accent)' }}
                    >
                      <Avatar className="size-full rounded-full">
                        <AvatarFallback className="relative overflow-hidden p-0">
                          <UserAvatarPattern
                            className="size-full"
                            userName={displayName}
                            config={savedAvatarConfig}
                          />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvatarEditorOpen(true)}
                      className="absolute bottom-2 right-2 z-10 flex size-9 items-center justify-center rounded-full transition-colors duration-150"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '2px solid var(--color-accent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <AvatarEditorModal
                    open={avatarEditorOpen}
                    onOpenChange={setAvatarEditorOpen}
                    initialConfig={
                      savedAvatarConfig ?? defaultAvatarConfig(displayName)
                    }
                    onSave={saveAvatarConfig}
                  />
                </div>
                <div className="lg:col-span-7">
                  <div
                    className="mb-4 flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <User size={20} />
                    <h2 className="font-serif text-lg">Bio</h2>
                  </div>
                  <div
                    className="glass-panel-sm relative rounded-3xl p-8"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="space-y-6">
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Instruments
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Tag icon={Mic2} label="Vocals" />
                          <Tag icon={Music} label="Piano" />
                          <Tag icon={Music} label="Guitar" />
                          <Tag icon={Activity} label="Drums" />
                        </div>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ background: 'var(--color-border)' }}
                      />
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Genres
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Tag icon={Activity} label="Pop" />
                          <Tag icon={Activity} label="R&B" />
                        </div>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ background: 'var(--color-border)' }}
                      />
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Focus
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Tag icon={Activity} label="Producing" />
                          <Tag icon={Activity} label="Songwriting" />
                          <Tag icon={Activity} label="Performing" />
                          <Tag icon={Activity} label="Education" />
                          <Tag icon={Activity} label="Audio" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="mb-4 flex items-center gap-6">
                    <h2
                      className="font-serif text-xl"
                      style={{ color: 'var(--color-text)' }}
                    >
                      XP
                    </h2>
                    <div
                      className="flex gap-4 text-xs font-medium"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      <span>This Week vs Last Week</span>
                    </div>
                  </div>
                  <div
                    className="glass-panel-sm relative flex h-64 w-full items-center justify-center rounded-3xl p-4"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    Chart Placeholder
                  </div>
                </div>
                <div className="mt-8 lg:col-span-4 lg:mt-0">
                  <div
                    className="mb-4 flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Users size={18} />
                    <h2 className="font-serif text-lg">Connect</h2>
                    <ChevronRight
                      size={16}
                      style={{ color: 'var(--color-text-dim)' }}
                    />
                  </div>
                  <div
                    className="glass-panel-sm relative rounded-3xl p-4"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text)' }}
                          >
                            Coming Soon...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'General' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <AudioSettings />
                </div>
                <div>
                  <LookAndFeelSettings />
                </div>
              </div>
              <MidiSettings />
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'Account' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <AccountSettings />
                </div>
                <div>
                  <HelpPanel />
                </div>
              </div>
            </div>
          )}

          {/* Codes Tab */}
          {activeTab === 'Codes' && (
            <div className="space-y-6">
              <ContentCodesSettings />
            </div>
          )}
        </div>
      </div>

      {/* Logo — sticky to bottom */}
      <div className="flex justify-center py-4">
        <img
          src="/music-atlas-moving-logo.gif"
          alt="Music Atlas"
          className="h-24"
        />
      </div>
    </div>
  );
};
