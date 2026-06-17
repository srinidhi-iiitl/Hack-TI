import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mic, MicOff, Rocket, Send, Volume2, X, Zap } from 'lucide-react';
import { useTwinAssistant } from './twinAssistantContext';
import { useTheme } from '../../context/ThemeContext';

const stateConfig = {
  disabled: {
    label: 'Disabled',
    statusText: 'Twin Assistant is disabled. Enable it in Settings.',
    buttonClass: 'border-white/12 bg-[#202633] text-white/58',
    dotClass: 'bg-white/30',
    icon: MicOff,
  },
  ready: {
    label: '✅ Ready For Next Command',
    statusText: 'Ready for commands...',
    buttonClass: 'border-[#10c7a1]/35 bg-[#10c7a1] text-white',
    dotClass: 'bg-[#10c7a1]',
    icon: CheckCircle2,
  },
  ready_for_next_command: {
    label: '✅ Ready For Next Command',
    statusText: 'Ready for commands...',
    buttonClass: 'border-[#10c7a1]/35 bg-[#10c7a1] text-white',
    dotClass: 'bg-[#10c7a1]',
    icon: CheckCircle2,
  },
  listening: {
    label: '🎤 Listening',
    statusText: 'Listening...',
    buttonClass: 'border-[#10c7a1]/45 bg-[#10c7a1] text-white shadow-[0_0_34px_-10px_rgba(16,199,161,0.9)]',
    dotClass: 'bg-[#10c7a1]',
    icon: Mic,
  },
  processing: {
    label: '⚡ Processing',
    statusText: 'Processing command...',
    buttonClass: 'border-[#60a5fa]/45 bg-[#2563eb] text-white shadow-[0_0_38px_-10px_rgba(96,165,250,0.95)]',
    dotClass: 'bg-[#60a5fa]',
    icon: Zap,
  },
  executing: {
    label: '🚀 Executing',
    statusText: 'Executing command...',
    buttonClass: 'border-[#fb923c]/45 bg-[#ea580c] text-white shadow-[0_0_38px_-10px_rgba(251,146,60,0.95)]',
    dotClass: 'bg-[#fb923c]',
    icon: Rocket,
  },
  responding: {
    label: '🔊 Speaking',
    statusText: 'Speaking...',
    buttonClass: 'border-[#22d3ee]/45 bg-[#0891b2] text-white shadow-[0_0_38px_-10px_rgba(34,211,238,0.95)]',
    dotClass: 'bg-[#22d3ee]',
    icon: Volume2,
  },
  speaking: {
    label: '🔊 Speaking',
    statusText: 'Speaking...',
    buttonClass: 'border-[#22d3ee]/45 bg-[#0891b2] text-white shadow-[0_0_38px_-10px_rgba(34,211,238,0.95)]',
    dotClass: 'bg-[#22d3ee]',
    icon: Volume2,
  },
};

const emptyMessages = [];

const voiceStatusText = {
  offline: 'Disconnected',
  connecting: 'Connecting voice...',
  listening: '🎤 Listening',
  error: 'Disconnected',
};

const busyStates = new Set(['processing', 'executing', 'responding', 'speaking']);

function getReadinessState(assistantState, voiceStatus, theme) {
  const isLight = theme === 'light';

  if (assistantState === 'listening' && voiceStatus === 'listening') {
    return {
      title: 'Speak now',
      detail: 'Mic is active and waiting for your command.',
      icon: Mic,
      tone: isLight
        ? 'border-slate-200 bg-white text-slate-900 shadow-lg'
        : 'border-[#10c7a1]/35 bg-[#071d19]/95 text-[#7df3cc] shadow-[0_18px_45px_-24px_rgba(16,199,161,0.95)]',
      iconTone: 'bg-[#10c7a1] text-white',
      pulseTone: 'bg-[#10c7a1]',
      showWave: true,
      detailClass: isLight ? 'text-slate-600' : 'text-white/58',
    };
  }

  if (busyStates.has(assistantState)) {
    const busyCopy = {
      processing: ['Please wait', 'Processing your command.'],
      executing: ['Please wait', 'Executing your request.'],
      responding: ['Please wait', 'Speaking response.'],
      speaking: ['Please wait', 'Speaking response.'],
    };
    const [title, detail] = busyCopy[assistantState] || ['Please wait', 'Assistant is busy.'];

    return {
      title,
      detail,
      icon: stateConfig[assistantState]?.icon || Zap,
      tone: isLight
        ? 'border-slate-200 bg-white text-slate-900 shadow-lg'
        : 'border-[#fb923c]/35 bg-[#24150b]/95 text-[#fed7aa] shadow-[0_18px_45px_-24px_rgba(251,146,60,0.8)]',
      iconTone: 'bg-[#ea580c] text-white',
      pulseTone: 'bg-[#fb923c]',
      showWave: false,
      detailClass: isLight ? 'text-slate-600' : 'text-white/58',
    };
  }

  if (voiceStatus === 'connecting' || assistantState === 'ready' || assistantState === 'ready_for_next_command') {
    return {
      title: 'Wait',
      detail: 'Connecting microphone...',
      icon: CheckCircle2,
      tone: isLight
        ? 'border-slate-200 bg-white text-slate-900 shadow-lg'
        : 'border-[#60a5fa]/30 bg-[#081527]/95 text-[#bfdbfe] shadow-[0_18px_45px_-24px_rgba(96,165,250,0.75)]',
      iconTone: 'bg-[#2563eb] text-white',
      pulseTone: 'bg-[#60a5fa]',
      showWave: false,
      detailClass: isLight ? 'text-slate-600' : 'text-white/58',
    };
  }

  return {
    title: 'Not listening',
    detail: voiceStatus === 'error' ? 'Voice connection failed. Retry before speaking.' : 'Enable voice or wait for connection.',
    icon: MicOff,
    tone: isLight
      ? 'border-slate-200 bg-white text-slate-900 shadow-lg'
      : 'border-white/12 bg-[#121822]/95 text-white/70 shadow-[0_18px_45px_-24px_rgba(0,0,0,0.8)]',
    iconTone: 'bg-white/10 text-white/70',
    pulseTone: 'bg-white/40',
    showWave: false,
    detailClass: isLight ? 'text-slate-600' : 'text-white/58',
  };
}

export default function TwinAssistantButton() {
  const { theme } = useTheme();
  const assistant = useTwinAssistant();
  const [typedCommand, setTypedCommand] = useState('');
  const latestMessageRef = useRef(null);

  const transcript = assistant?.transcript || '';
  const speechActive = Boolean(assistant?.speechActive);
  const messages = assistant?.messages || emptyMessages;
  const assistantState = assistant?.assistantState || 'disabled';
  const assistantMessage = assistant?.assistantMessage || '';
  const voiceStatus = assistant?.voiceStatus || 'offline';
  const panelOpen = Boolean(assistant?.panelOpen);
  const setPanelOpen = assistant?.setPanelOpen;
  const toggleListening = assistant?.toggleListening;
  const retryConnection = assistant?.retryConnection;
  const submitTextCommand = assistant?.submitTextCommand;

  const config = stateConfig[assistantState] || stateConfig.disabled;
  const displayLabel = config.label;
  const Icon = config.icon;
  const readiness = getReadinessState(assistantState, voiceStatus, theme);
  const ReadinessIcon = readiness.icon;
  const canSpeakNow = assistantState === 'listening' && voiceStatus === 'listening';

  useEffect(() => {
    latestMessageRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, assistantMessage, transcript]);

  if (!assistant?.enabled) return null;

  const handleTextSubmit = (event) => {
    event.preventDefault();
    const command = typedCommand.trim();
    if (!command) return;

    submitTextCommand?.(command);
    setTypedCommand('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-3">
      {panelOpen && (
        <div className={`w-[min(24rem,calc(100vw-3rem))] rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${
          theme === 'light'
            ? 'border-slate-200 bg-white text-slate-900 shadow-xl'
            : 'border-white/10 bg-[#080d15]/95 text-white shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)]'
        }`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.22em] ${
                theme === 'light' ? 'text-slate-900' : 'text-[#7df3cc]/70'
              }`}>Twin Assistant</p>
              <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${
                theme === 'light' ? 'text-slate-700' : 'text-white/56'
              }`}>
                <span className="relative flex h-2.5 w-2.5">
                  {canSpeakNow && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.dotClass} opacity-75`} />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
                </span>
                <span>{displayLabel}</span>
              </div>
              <p className={`mt-1 text-xs font-semibold ${
                theme === 'light' ? 'text-slate-500' : 'text-white/38'
              }`}>{voiceStatusText[voiceStatus] || voiceStatusText.offline}</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                theme === 'light'
                  ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  : 'border-white/10 bg-white/[0.055] text-white/62 hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Close Twin Assistant panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className={`rounded-xl border p-3 ${
                  theme === 'light'
                    ? 'border-slate-200 bg-white'
                    : 'border-white/10 bg-white/[0.045]'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/36'
                  }`}>Assistant</p>
                  <p className={`mt-1 ${theme === 'light' ? 'text-slate-700' : 'text-white/84'}`}>Speak a command like "Open dashboard" or "Show my health score."</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    ref={index === messages.length - 1 ? latestMessageRef : null}
                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl border px-3.5 py-3 ${
                        message.role === 'assistant'
                          ? theme === 'light'
                            ? 'rounded-bl-md border-[#10c7a1]/30 bg-[#10c7a1]/10 text-left text-slate-800'
                            : 'rounded-bl-md border-[#10c7a1]/20 bg-[#10c7a1]/10 text-left'
                          : theme === 'light'
                            ? 'rounded-br-md border-[#7b61ff]/30 bg-[#7b61ff]/10 text-right text-slate-800'
                            : 'rounded-br-md border-[#7b61ff]/25 bg-[#7b61ff]/20 text-right'
                      }`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        message.role === 'assistant'
                          ? theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]/70'
                          : theme === 'light' ? 'text-[#5e3aff]' : 'text-[#c7bdff]/80'
                      }`}
                      >
                        {message.role === 'assistant' ? 'Assistant' : 'You'}
                      </p>
                      <p className={`mt-1 break-words ${theme === 'light' ? 'text-slate-700' : 'text-white/84'}`}>{message.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messages.length === 0 ? latestMessageRef : null} />
            </div>

            <div className={`rounded-xl border p-3 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.045]'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/36'
                  }`}>Live</p>
                  <p className={`mt-1 min-h-5 ${theme === 'light' ? 'text-slate-700' : 'text-white/84'}`}>{transcript || assistantMessage || config.statusText}</p>
                  <p className={`mt-2 text-xs leading-5 ${theme === 'light' ? 'text-slate-500' : 'text-white/48'}`}>
                    Heard: <span className={theme === 'light' ? 'text-slate-700 font-medium' : 'text-white/78'}>{transcript ? `"${transcript}"` : 'Waiting for speech...'}</span>
                  </p>
                  <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${theme === 'light' ? 'text-slate-400' : 'text-white/32'}`}>
                    {voiceStatusText[voiceStatus] || voiceStatusText.offline}
                  </p>
                </div>
                {assistantState === 'processing' && <ThinkingDots />}
              </div>
              {(canSpeakNow || speechActive) && <Waveform />}
              {voiceStatus === 'error' && (
                <button
                  type="button"
                  onClick={retryConnection}
                  className={`mt-3 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                    theme === 'light'
                      ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0f9f80] hover:bg-[#10c7a1]/15'
                      : 'border-[#10c7a1]/25 bg-[#10c7a1]/12 text-[#7df3cc] hover:bg-[#10c7a1]/20'
                  }`}
                >
                  Retry Connection
                </button>
              )}
            </div>

            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={typedCommand}
                onChange={(event) => setTypedCommand(event.target.value)}
                placeholder="Type a command..."
                className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#10c7a1]'
                    : 'border-white/10 bg-white/[0.045] text-white placeholder:text-white/32 focus:border-[#10c7a1]/45 focus:bg-white/[0.07]'
                }`}
              />
              <button
                type="submit"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  theme === 'light'
                    ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0f9f80] hover:bg-[#10c7a1]/15'
                    : 'border-[#10c7a1]/25 bg-[#10c7a1]/15 text-[#7df3cc] hover:bg-[#10c7a1]/25'
                }`}
                aria-label="Send Twin Assistant command"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={`w-[min(21rem,calc(100vw-3rem))] rounded-2xl border px-4 py-3 backdrop-blur-xl ${readiness.tone}`}>
        <div className="flex items-center gap-3">
          <span className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${readiness.iconTone}`}>
            {canSpeakNow && (
              <span className={`absolute inset-0 animate-ping rounded-2xl ${readiness.pulseTone} opacity-35`} />
            )}
            <ReadinessIcon className={`relative h-5 w-5 ${canSpeakNow ? 'animate-pulse' : ''}`} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.16em]">{readiness.title}</p>
            <p className={`mt-0.5 text-xs font-semibold ${readiness.detailClass}`}>{readiness.detail}</p>
          </div>
        </div>
        {readiness.showWave && <Waveform compact />}
      </div>

      <button
        type="button"
        onClick={toggleListening}
        className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 ${
          canSpeakNow ? 'ring-4 ring-[#10c7a1]/25' : ''
        } ${config.buttonClass}`}
        aria-label={`Twin Assistant ${displayLabel}`}
      >
        <Icon className={`h-7 w-7 ${canSpeakNow || speechActive ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-label="Processing">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]"
          style={{ animation: `twin-thinking 0.9s ease-in-out ${dot * 0.12}s infinite alternate` }}
        />
      ))}
      <style>{`
        @keyframes twin-thinking {
          from { transform: translateY(0); opacity: 0.45; }
          to { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Waveform({ compact = false }) {
  return (
    <div className={`mt-3 flex items-end gap-1.5 ${compact ? 'h-5 pl-14' : 'h-8'}`}>
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={`${compact ? 'w-1' : 'w-1.5'} rounded-full bg-[#10c7a1]`}
          style={{
            height: `${compact ? 7 + (bar % 3) * 4 : 12 + (bar % 3) * 6}px`,
            animation: `twin-wave 0.8s ease-in-out ${bar * 0.08}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes twin-wave {
          from { transform: scaleY(0.45); opacity: 0.55; }
          to { transform: scaleY(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
