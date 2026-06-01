import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, X } from 'lucide-react';
import { useTwinAssistant } from './twinAssistantContext';

const stateConfig = {
  disabled: {
    label: 'Disabled',
    statusText: 'Twin Assistant is disabled. Enable it in Settings.',
    buttonClass: 'border-white/12 bg-[#202633] text-white/58',
    dotClass: 'bg-white/30',
    icon: MicOff,
  },
  ready: {
    label: 'Ready',
    statusText: 'Ready for commands...',
    buttonClass: 'border-[#10c7a1]/35 bg-[#10c7a1] text-white',
    dotClass: 'bg-[#10c7a1]',
    icon: Mic,
  },
  listening: {
    label: 'Listening',
    statusText: 'Listening...',
    buttonClass: 'border-[#10c7a1]/45 bg-[#10c7a1] text-white shadow-[0_0_34px_-10px_rgba(16,199,161,0.9)]',
    dotClass: 'bg-[#10c7a1]',
    icon: Mic,
  },
  processing: {
    label: 'Processing',
    statusText: 'Processing command...',
    buttonClass: 'border-[#60a5fa]/45 bg-[#2563eb] text-white shadow-[0_0_38px_-10px_rgba(96,165,250,0.95)]',
    dotClass: 'bg-[#60a5fa]',
    icon: Mic,
  },
  responding: {
    label: 'Responding',
    statusText: 'Responding...',
    buttonClass: 'border-[#22d3ee]/45 bg-[#0891b2] text-white shadow-[0_0_38px_-10px_rgba(34,211,238,0.95)]',
    dotClass: 'bg-[#22d3ee]',
    icon: Mic,
  },
};

const emptyMessages = [];

export default function TwinAssistantButton() {
  const assistant = useTwinAssistant();
  const [typedCommand, setTypedCommand] = useState('');
  const latestMessageRef = useRef(null);

  const transcript = assistant?.transcript || '';
  const speechActive = Boolean(assistant?.speechActive);
  const messages = assistant?.messages || emptyMessages;
  const assistantState = assistant?.assistantState || 'disabled';
  const assistantMessage = assistant?.assistantMessage || '';
  const panelOpen = Boolean(assistant?.panelOpen);
  const setPanelOpen = assistant?.setPanelOpen;
  const toggleListening = assistant?.toggleListening;
  const submitTextCommand = assistant?.submitTextCommand;

  const config = stateConfig[assistantState] || stateConfig.disabled;
  const Icon = config.icon;

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
        <div className="w-[min(24rem,calc(100vw-3rem))] rounded-2xl border border-white/10 bg-[#080d15]/95 p-4 text-white shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7df3cc]/70">Twin Assistant</p>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/56">
                <span className="relative flex h-2.5 w-2.5">
                  {speechActive && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.dotClass} opacity-75`} />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
                </span>
                <span>{config.label}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white"
              aria-label="Close Twin Assistant panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/36">Assistant</p>
                  <p className="mt-1 text-white/84">Speak a command like "Open dashboard" or "Show my health score."</p>
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
                          ? 'rounded-bl-md border-[#10c7a1]/20 bg-[#10c7a1]/10 text-left'
                          : 'rounded-br-md border-[#7b61ff]/25 bg-[#7b61ff]/20 text-right'
                      }`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        message.role === 'assistant' ? 'text-[#7df3cc]/70' : 'text-[#c7bdff]/80'
                      }`}
                      >
                        {message.role === 'assistant' ? 'Assistant' : 'You'}
                      </p>
                      <p className="mt-1 break-words text-white/84">{message.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messages.length === 0 ? latestMessageRef : null} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/36">Live</p>
                  <p className="mt-1 min-h-5 text-white/84">{transcript || assistantMessage || config.statusText}</p>
                </div>
                {assistantState === 'processing' && <ThinkingDots />}
              </div>
              {speechActive && <Waveform />}
            </div>

            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={typedCommand}
                onChange={(event) => setTypedCommand(event.target.value)}
                placeholder="Type a command..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#10c7a1]/45 focus:bg-white/[0.07]"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#10c7a1]/25 bg-[#10c7a1]/15 text-[#7df3cc] transition hover:bg-[#10c7a1]/25"
                aria-label="Send Twin Assistant command"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleListening}
        className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 ${config.buttonClass}`}
        aria-label={`Twin Assistant ${config.label}`}
      >
        <Icon className={`h-7 w-7 ${speechActive ? 'animate-pulse' : ''}`} />
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

function Waveform() {
  return (
    <div className="mt-3 flex h-8 items-end gap-1.5">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="w-1.5 rounded-full bg-[#10c7a1]"
          style={{
            height: `${12 + (bar % 3) * 6}px`,
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
