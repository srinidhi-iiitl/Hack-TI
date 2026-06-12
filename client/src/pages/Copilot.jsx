import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, BrainCircuit, Volume2, StopCircle, Mic, MicOff,
  AlertTriangle, Zap, X, User, Bot, ChevronRight, Target, Send,
  RefreshCw, Paperclip, FileText, Activity, DollarSign
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const glass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';

// ─── Follow-up chip suggestions per context ───────────────────────────────────
const FOLLOW_UP_CHIPS = {
  finance: [
    'How does this affect my savings goal?',
    'What if prices rise 10% next month?',
    'Show me a 3-month action plan',
  ],
  health: [
    'How does this affect my calorie goal?',
    'What micronutrients am I missing?',
    'Can I eat this if I\'m trying to lose weight?',
  ],
  medical: [
    'What lifestyle changes help with this?',
    'Should I be worried about these results?',
    'What questions should I ask my doctor?',
  ],
  general: [
    'Break this into weekly milestones',
    'What\'s the biggest risk here?',
    'How does this link to my health data?',
  ],
};

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
        isUser ? 'bg-[#7b61ff]/20 text-[#7b61ff]' : 'bg-[#10c7a1]/20 text-[#10c7a1]'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-[#7b61ff]/15 border border-[#7b61ff]/25 text-white/90 rounded-tr-sm'
          : 'bg-white/5 border border-white/10 text-white/85 rounded-tl-sm'
      }`}>
        {/* If user message has attachment, show it */}
        {isUser && msg.attachmentPreview && (
          <div className="mb-2 max-w-xs overflow-hidden rounded-lg border border-white/10">
            <img src={msg.attachmentPreview} alt="attachment" className="max-h-40 w-full object-cover" />
          </div>
        )}
        {isUser && msg.attachmentName && !msg.attachmentPreview && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/70">
            <FileText className="h-4 w-4 text-[#7b61ff]" />
            <span className="truncate max-w-[180px]">{msg.attachmentName}</span>
          </div>
        )}
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <OracleResponse data={msg.content} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Oracle response renderer (full) ──────────────────────────────────────────
function OracleResponse({ data }) {
  const getRiskStyles = (level) => {
    switch(level?.toLowerCase()) {
      case 'low':  return { border: 'border-[#10c7a1]/40', bg: 'bg-[#10c7a1]/10', text: 'text-[#10c7a1]' };
      case 'high': return { border: 'border-[#ff4d7d]/40', bg: 'bg-[#ff4d7d]/10', text: 'text-[#ff4d7d]' };
      default:     return { border: 'border-[#c8a84b]/40', bg: 'bg-[#c8a84b]/10', text: 'text-[#c8a84b]' };
    }
  };
  const rs = getRiskStyles(data.riskLevel);

  return (
    <div className="space-y-4 w-full">
      <div className={`rounded-xl border ${rs.border} ${rs.bg} p-4`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${rs.text} mb-2 flex items-center gap-1.5`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Copilot Verdict · Risk: {data.riskLevel || 'Medium'}
        </p>
        <p className="text-sm font-semibold text-white leading-relaxed">{data.verdict}</p>
      </div>

      {data.impacts?.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7b61ff] mb-3">Cross-Domain Impacts</p>
          <div className="space-y-2">
            {data.impacts.map((imp, i) => (
              <div key={i} className="flex gap-2.5 items-start text-xs">
                <div className="mt-0.5 rounded bg-white/10 p-1">
                  {imp.domain?.toLowerCase() === 'health' ? <Activity className="h-3 w-3 text-[#ff4d7d]" /> :
                   imp.domain?.toLowerCase() === 'finance' ? <DollarSign className="h-3 w-3 text-[#10c7a1]" /> :
                   <BrainCircuit className="h-3 w-3 text-[#c8a84b]" />}
                </div>
                <p className="text-white/80"><strong className="text-white">{imp.domain}:</strong> {imp.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.action && (
        <div className="rounded-xl border border-[#10c7a1]/30 bg-gradient-to-br from-[#11131a] to-[#10c7a1]/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#10c7a1] mb-1 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Recommended Action
          </p>
          <p className="text-xs text-white/90 leading-relaxed">{data.action}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Copilot() {
  const [chatFile, setChatFile]                   = useState(null);
  const [chatFilePreview, setChatFilePreview]     = useState(null);
  const [savedGoalUpdate, setSavedGoalUpdate]     = useState(null); // goal auto-updated state

  // Chat
  const [chatInput, setChatInput]         = useState('');
  const [chatHistory, setChatHistory]     = useState([]); // [{role, content, attachmentName, attachmentPreview}]
  const [isConsulting, setIsConsulting]   = useState(false);
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [activeGoals, setActiveGoals]     = useState([]);

  const fileInputRef  = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef    = useRef(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const preset = localStorage.getItem('copilotPresetPrompt');
    if (preset) {
      setChatInput(preset);
      localStorage.removeItem('copilotPresetPrompt');
    }
  }, []);

  // Fetch active goals for context
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res   = await axios.get(`${API_BASE_URL}/api/goals`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          setActiveGoals(res.data.data.filter(g => g.currentMetric < g.targetMetric));
        }
    } catch { /* silent */ }
    };
    fetchGoals();
  }, []);

  // Speech Recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
      rec.onstart  = () => setIsListening(true);
      rec.onend    = () => setIsListening(false);
      rec.onresult = (e) => setChatInput(e.results[0][0].transcript);
      rec.onerror  = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { alert("Microphone not supported in this browser."); return; }
    if (isListening) { recognitionRef.current.stop(); }
    else { window.speechSynthesis?.cancel(); setIsSpeaking(false); setChatInput(''); recognitionRef.current.start(); }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const clean = text.replace(/[*_#`]/g, '').replace(/\n+/g, '. ');
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate    = 0.95; utt.pitch = 1.0;
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  };

  const handleChatFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setChatFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setChatFilePreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setChatFilePreview(null);
    }
  };

  const clearChatFile = () => {
    setChatFile(null);
    setChatFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAskOracle = async (questionOverride) => {
    if (requestInFlightRef.current || isConsulting) return;

    const questionText = questionOverride || chatInput;
    let question = questionText;

    if (chatFile && !question?.trim()) {
      if (chatFile.type.startsWith('image/')) {
        question = "What should I add to my meal to make it balanced and healthy?";
      } else {
        question = "Suggest what I can do next month based on this data.";
      }
    }

    if (!question?.trim() && !chatFile) return;
    window.speechSynthesis?.cancel(); setIsSpeaking(false);

    // Keep references to selected file and preview to put in history
    const fileToUpload = chatFile;
    const filePreview = chatFilePreview;
    const fileName = chatFile ? chatFile.name : null;

    // Add user message to history
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: question,
      attachmentName: fileName,
      attachmentPreview: filePreview
    }]);

    setChatInput('');
    clearChatFile();
    requestInFlightRef.current = true;
    setIsConsulting(true);

    try {
      const token = localStorage.getItem('authToken');
      let documentContext = '';

      if (fileToUpload) {
        // Upload file/image
        const formData = new FormData();
        formData.append('file', fileToUpload);

        const uploadRes = await axios.post(`${API_BASE_URL}/api/ai/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
        });

        if (uploadRes.data.success) {
          const resultData = uploadRes.data.data;
          const extracted = resultData.extractedData || {};
          const domain = resultData.domain;

          // Parse and notify updated goals
          if (resultData.updatedGoals && resultData.updatedGoals.length > 0) {
            setSavedGoalUpdate(resultData.updatedGoals[0]);
            setTimeout(() => setSavedGoalUpdate(null), 6000);
          }

          // Build context block for the Oracle
          if (domain === 'health' || fileToUpload.type.startsWith('image/')) {
            const healthData = extracted.healthData || {};
            const calories = healthData.calories || extracted.crossDomainEffects?.health?.caloriesConsumed || 0;
            const protein = healthData.protein || extracted.crossDomainEffects?.health?.proteinConsumed || 0;
            const carbs = healthData.carbs || 0;
            const fat = healthData.fat || 0;
            const foodName = healthData.foodName || extracted.crossDomainEffects?.health?.foodName || 'Food Item';
            
            documentContext = `\n[Context: User scanned a meal/health document named "${fileName}". Extracted Details: Food: ${foodName}, Calories: ${calories} kcal, Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g. Deficiencies: ${JSON.stringify(healthData.deficiencies || [])}. Medications: ${JSON.stringify(healthData.medications || [])}.]`;
          } else if (domain === 'finance') {
            const financeData = extracted.financeData || {};
            const spent = financeData.moneySpent || financeData.totalAmount || 0;
            const credited = financeData.moneyCredited || 0;
            const portfolio = financeData.portfolioValue || 0;
            const txCount = (financeData.transactions || []).length;
            
            documentContext = `\n[Context: User uploaded a financial statement named "${fileName}". Extracted Details: Total Spent: ₹${spent}, Total Credited: ₹${credited}, Portfolio Value: ₹${portfolio}, Number of transactions: ${txCount}. Holdings: ${JSON.stringify(financeData.holdings || [])}.]`;
          } else if (domain === 'career') {
            const careerData = extracted.careerData || {};
            documentContext = `\n[Context: User uploaded a career document named "${fileName}". Extracted Details: Study Hours: ${careerData.studyHours || 0}, Completed Courses: ${careerData.completedCourses || 0}, Commits: ${careerData.githubCommits || 0}.]`;
          }
        } else {
          throw new Error('Upload parsing failed');
        }
      }

      // Inject goals context
      const goalsContext = activeGoals.length > 0
        ? `\n\nUser's active goals:\n${activeGoals.map(g =>
            `- [${g.domain.toUpperCase()}] "${g.title}": ${g.currentMetric}/${g.targetMetric} ${g.unit} (${g.priority} priority)`
          ).join('\n')}`
        : '';

      const res = await axios.post(`${API_BASE_URL}/api/ai/consult`,
        { question: question + documentContext + goalsContext },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const parsed = parseOracleAdvice(res.data.advice);
        setChatHistory(prev => [...prev, { role: 'assistant', content: parsed }]);
      }
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: {
          verdict: 'I encountered an error processing that query and attachment.',
          riskLevel: 'Medium',
          impacts: [],
          action: 'Please try rephrasing your question or re-uploading the attachment.'
        }
      }]);
    } finally {
      requestInFlightRef.current = false;
      setIsConsulting(false);
    }
  };

  const getFollowUps = () => {
    if (chatHistory.length === 0) return [];
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg.role !== 'assistant') return [];
    const verdict  = lastMsg.content?.verdict?.toLowerCase() || '';
    const detected = verdict.includes('gold') || verdict.includes('invest') || verdict.includes('spending') || verdict.includes('budget') ? 'finance' :
                     verdict.includes('calor') || verdict.includes('sleep') || verdict.includes('meal') || verdict.includes('protein') ? 'health' :
                     verdict.includes('doctor') || verdict.includes('vitals') || verdict.includes('deficienc') ? 'medical' : 'general';
    return FOLLOW_UP_CHIPS[detected] || FOLLOW_UP_CHIPS.general;
  };

  const followUps = getFollowUps();

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-8 text-white sm:px-8 flex flex-col justify-between">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-[#7b61ff]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#10c7a1]/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl flex-1 flex flex-col justify-between">
        
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7b61ff] to-[#10c7a1] shadow-[0_0_25px_rgba(123,97,255,0.25)]">
            <BrainCircuit className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Twin Copilot Oracle</h1>
          <p className="mt-1.5 text-white/50 text-xs">
            Ask details, upload meals or bank statements in the chat below. AI will sync with your digital twin goals.
          </p>
        </motion.header>

        {/* Goal auto-update notification toast */}
        <AnimatePresence>
          {savedGoalUpdate && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-[#10c7a1]/40 bg-[#10c7a1]/15 px-5 py-3.5 shadow-lg">
              <Target className="h-5 w-5 text-[#10c7a1] flex-shrink-0 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-[#10c7a1]">Goal Progress Auto-Updated!</p>
                <p className="text-[11px] text-white/70">
                  Your goal <strong>"{savedGoalUpdate.title}"</strong> updated to {savedGoalUpdate.currentMetric} / {savedGoalUpdate.targetMetric} {savedGoalUpdate.unit}.
                </p>
              </div>
              <button onClick={() => setSavedGoalUpdate(null)} className="ml-auto text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat Window ── */}
        <section className={`flex-1 flex flex-col justify-between ${glass} p-5 mb-4 min-h-[520px] max-h-[70vh]`}>
          
          {/* Chat header */}
          <header className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10c7a1] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10c7a1]"></span>
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                {activeGoals.length > 0 ? `${activeGoals.length} goals loaded as context` : 'Oracle Active'}
              </p>
            </div>
            {chatHistory.length > 0 && (
              <button onClick={() => setChatHistory([])}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/50 hover:text-white transition">
                <RefreshCw className="h-3 w-3" /> Reset Conversation
              </button>
            )}
          </header>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {chatHistory.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-white/30 px-6">
                <Bot className="h-12 w-12 text-[#7b61ff]/40 mb-3 animate-pulse" />
                <p className="font-semibold text-white/50">Welcome to your Twin Copilot</p>
                <p className="text-xs max-w-sm mt-1">
                  Upload an image of your meal to analyze nutritional additions, upload a bank statement to plan next month, or ask questions relative to your SMART goals.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))
            )}
            {isConsulting && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10c7a1]/20 text-[#10c7a1]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-[#7b61ff]"
                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions and inputs */}
          <div className="space-y-3">
            {/* Follow-up chips */}
            <AnimatePresence>
              {followUps.length > 0 && !isConsulting && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2 flex-wrap max-h-24 overflow-y-auto">
                  {followUps.map((chip, i) => (
                    <button key={i} onClick={() => handleAskOracle(chip)} disabled={isConsulting}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <ChevronRight className="h-3 w-3 text-[#7b61ff]" /> {chip}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Attachment Preview */}
            {chatFile && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 p-2.5">
                <div className="flex items-center gap-2.5">
                  {chatFilePreview ? (
                    <img src={chatFilePreview} alt="Preview" className="h-10 w-10 rounded-lg object-cover border border-white/10" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/50 border border-white/10">
                      <FileText className="h-5 w-5 text-[#7b61ff]" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-white max-w-[200px] truncate">{chatFile.name}</p>
                    <p className="text-[10px] text-white/40">{(chatFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={clearChatFile} className="rounded-full bg-white/10 p-1 hover:bg-white/20 text-white/60 hover:text-white transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input Row */}
            <div className="flex gap-2.5 items-center">
              <input type="file" ref={fileInputRef} className="hidden"
                accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleChatFileSelect} />
              
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isConsulting}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition disabled:opacity-40">
                <Paperclip className="h-5 w-5" />
              </button>

              <div className="relative flex-1">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskOracle();
                    }
                  }}
                  placeholder={isListening ? 'Listening...' : 'Type a question or ask about an attached file...'}
                  className={`w-full h-12 rounded-xl border pl-4 pr-12 text-xs text-white placeholder-white/25 bg-white/5 focus:outline-none transition-colors ${
                    isListening ? 'border-[#ff4d7d]/50 bg-[#ff4d7d]/5' : 'border-white/10 focus:border-[#7b61ff]'}`}
                  disabled={isConsulting} />
                <button type="button" onClick={toggleListening} disabled={isConsulting}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-all ${
                    isListening ? 'bg-[#ff4d7d] text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>

              <button onClick={() => handleAskOracle()} disabled={isConsulting || isListening || (!chatInput.trim() && !chatFile)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7b61ff] text-white shadow-lg transition hover:bg-[#6345ed] disabled:opacity-40 disabled:hover:bg-[#7b61ff]">
                {isConsulting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* TTS button for last oracle response */}
          {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant' && (
            <div className="mt-2.5 flex justify-end border-t border-white/5 pt-2">
              <button onClick={() => {
                const last = chatHistory[chatHistory.length - 1].content;
                handleSpeak(`${last.verdict}. ${last.action || ''}`);
              }} className="flex items-center gap-1.5 rounded-lg border border-[#7b61ff]/20 bg-[#7b61ff]/5 px-2.5 py-1.5 text-xs font-semibold text-white/50 hover:text-white transition">
                {isSpeaking ? <StopCircle className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
              </button>
            </div>
          )}

        </section>

      </div>
    </div>
  );
}

function parseOracleAdvice(advice) {
  if (advice && typeof advice === 'object') return normalizeOracleAdvice(advice);

  try {
    return normalizeOracleAdvice(JSON.parse(String(advice || '{}')));
  } catch {
    return normalizeOracleAdvice({
      verdict: String(advice || 'Copilot could not read the AI response.'),
      riskLevel: 'Medium',
      impacts: [],
      action: 'Please retry your question in a shorter sentence.',
    });
  }
}

function normalizeOracleAdvice(advice = {}) {
  return {
    verdict: advice.verdict || 'Copilot could not generate a verdict.',
    riskLevel: ['Low', 'Medium', 'High'].includes(advice.riskLevel) ? advice.riskLevel : 'Medium',
    impacts: Array.isArray(advice.impacts) ? advice.impacts : [],
    action: advice.action || 'Please retry your question.',
  };
}
