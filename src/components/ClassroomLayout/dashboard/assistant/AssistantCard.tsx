/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, useEffect, type FC, type FormEvent } from 'react';
import { ArrowRight, Mic, RotateCcw, Zap } from 'lucide-react';
import type { NavigateFunction } from 'react-router';
import { useAssistantMatcher } from './useAssistantMatcher';
import { useSpeechRecognition } from './useSpeechRecognition';
import type { AssistantPhase } from './types';

interface AssistantCardProps {
  navigate: NavigateFunction;
}

export const AssistantCard: FC<AssistantCardProps> = ({ navigate }) => {
  const [phase, setPhase] = useState<AssistantPhase>({ type: 'idle' });
  const [inputValue, setInputValue] = useState('');
  const { match } = useAssistantMatcher();
  const speech = useSpeechRecognition();

  // Wire speech transcript to submit
  useEffect(() => {
    if (speech.transcript) {
      setInputValue(speech.transcript);
      const matches = match(speech.transcript);
      setPhase({ type: 'result', query: speech.transcript, matches });
      speech.reset();
    }
  }, [speech.transcript, match, speech]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const matches = match(trimmed);
    setPhase({ type: 'result', query: trimmed, matches });
  };

  const handleReset = () => {
    setPhase({ type: 'idle' });
    setInputValue('');
  };

  return (
    <div className="col-span-2 md:col-span-2 lg:col-span-4 lg:row-span-2 z-10 flex flex-col">
      <div className="glass-panel rounded-2xl p-5 lg:p-6 flex-1 flex flex-col relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,#FFC9CC_0%,#D2CFC4_33%,#C3D4FF_66%,#8ED8B0_100%)] opacity-70" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Assistant</span>
          <Zap size={18} className="text-black/40" fill="currentColor" />
        </div>

        {/* Content area */}
        <div className="relative z-10 flex-1 flex flex-col justify-center min-h-0">
          {phase.type === 'idle' && (
            <>
              <p className="text-xl sm:text-2xl lg:text-[1.7rem] text-white leading-snug tracking-tight mb-4">
                What do you want to <span className="font-bold">learn</span> today?
              </p>
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Try 'learn funk' or 'play a game'..."
                  aria-label="Ask the assistant"
                  className="flex-1 bg-white/20 text-white placeholder:text-white/50 text-sm rounded-full px-4 py-2.5 outline-none focus:bg-white/30 transition-colors"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/30 text-white hover:bg-white/50 transition-colors shrink-0"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          {phase.type === 'result' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/60 truncate">
                &ldquo;{phase.query}&rdquo;
              </p>

              {phase.matches.length > 0 ? (
                phase.matches.map((m) => (
                  <button
                    key={m.entry.route}
                    onClick={() => navigate(m.entry.route)}
                    className="flex items-center justify-between gap-3 bg-white/25 hover:bg-white/40 rounded-2xl px-4 py-3 transition-colors text-left group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {m.entry.label}
                      </p>
                      <p className="text-[11px] text-white/60">
                        {m.entry.description}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-white/40 group-hover:text-white shrink-0 transition-colors" />
                  </button>
                ))
              ) : (
                <p className="text-sm text-white/70 leading-relaxed">
                  No matches found. Try something like{' '}
                  <span className="font-medium">&ldquo;learn jazz&rdquo;</span> or{' '}
                  <span className="font-medium">&ldquo;play a game&rdquo;</span>.
                </p>
              )}

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mt-1 self-start"
              >
                <RotateCcw size={12} />
                Ask again
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 flex items-center justify-between px-2 mt-2">
          {speech.isSupported ? (
            <button
              onClick={speech.isListening ? speech.stop : speech.start}
              aria-label="Voice input"
              aria-pressed={speech.isListening}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                speech.isListening
                  ? 'bg-white/50 text-red-600 animate-pulse'
                  : 'text-black/30 hover:text-black/60'
              }`}
            >
              <Mic size={18} />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
