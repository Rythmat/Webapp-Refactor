/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { ProfileRoutes } from '@/constants/routes';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { AccountSettings } from './sections/AccountSettings';
import { AudioSettings } from './sections/AudioSettings';
import { ContentCodesSettings } from './sections/ContentCodesSettings';
import { HelpPanel } from './sections/HelpPanel';
import { LookAndFeelSettings } from './sections/LookAndFeelSettings';
import { MidiSettings } from './sections/MidiSettings';
import './settings.css';

const TABS = ['General', 'Account', 'Content Codes'] as const;
type Tab = (typeof TABS)[number];

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('General');

  return (
    <div
      className="settings-root relative flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <HeaderBar title="Settings" />

      <div className="relative flex flex-1 flex-col overflow-y-auto px-8 pb-12">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* Tab bar + close button */}
          <div className="flex items-center justify-between">
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
              onClick={() => navigate(ProfileRoutes.profile())}
              className="flex size-8 items-center justify-center rounded-full transition-colors"
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

          {/* Content Codes Tab */}
          {activeTab === 'Content Codes' && (
            <div className="space-y-6">
              <ContentCodesSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
