import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Utensils, Receipt, Activity, FileText, CheckCircle, Loader2, Sparkles, BrainCircuit, Volume2, StopCircle, Mic, MicOff, AlertTriangle, Zap, DollarSign } from 'lucide-react';
import { useGamification } from '../context/GamificationContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function Copilot() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [contextType, setContextType] = useState('food'); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const { triggerReward } = useGamification();
  const [isSaving, setIsSaving] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [isConsulting, setIsConsulting] = useState(false);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recInstance = new SpeechRecognition();
      recInstance.continuous = false;
      recInstance.interimResults = false;
      recInstance.lang = 'en-US';

      recInstance.onstart = () => setIsListening(true);
      recInstance.onend = () => setIsListening(false);
      
      recInstance.onresult = (event) => {
        const voiceTranscript = event.results[0][0].transcript;
        setChatInput(voiceTranscript);
      };

      recInstance.onerror = (err) => {
        console.error('Speech Recognition Fault:', err);
        setIsListening(false);
      };

      recognitionRef.current = recInstance;
    }

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Your current web browser environment doesn't support live microphone dictation.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setChatInput(''); 
      recognitionRef.current.start();
    }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support text-to-speech.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleSaveToDashboard = async () => {
    if (!result) return;
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/api/ai/save`, {
        contextType,
        extractedData: result
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.gamification) {
        triggerReward(
          response.data.gamification.xpAwarded,
          response.data.gamification.newBadges,
          response.data.gamification.newTotalXP
        );
        clearSelection();
      }
    } catch (error) {
      console.error('Failed to save AI data:', error);
      alert('Failed to sync data with dashboard.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskOracle = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    setIsConsulting(true);
    setChatResponse(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/api/ai/consult`, {
        question: chatInput
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        const parsedAdvice = JSON.parse(response.data.advice);
        setChatResponse(parsedAdvice);
      }
    } catch (error) {
      console.error('Oracle consult failed:', error);
      setChatResponse({
        verdict: "My cognitive systems encountered an error parsing the data.",
        riskLevel: "High",
        impacts: [],
        action: "Please refresh or try a different query."
      });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setResult(null); 
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('contextType', contextType);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/api/ai/analyze`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      console.error('AI Analysis Failed:', error);
      alert('Failed to analyze image. Ensure your Gemini API key is correct and backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskStyles = (level) => {
    switch(level?.toLowerCase()) {
      case 'low': return { border: 'border-[#10c7a1]/50', bg: 'bg-[#10c7a1]/10', text: 'text-[#10c7a1]' };
      case 'high': return { border: 'border-[#ff4d7d]/50', bg: 'bg-[#ff4d7d]/10', text: 'text-[#ff4d7d]' };
      default: return { border: 'border-[#c8a84b]/50', bg: 'bg-[#c8a84b]/10', text: 'text-[#c8a84b]' };
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,97,255,0.15),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,199,161,0.1),transparent_30%)]" />

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7b61ff] to-[#10c7a1] shadow-[0_0_30px_rgba(123,97,255,0.3)]">
            <UploadCloud className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Vision Engine Copilot</h1>
          <p className="mt-2 text-white/60">Upload a meal, a medical report, or a receipt. The AI will extract the data automatically.</p>
        </header>

        {/* --- 1. Context Selector --- */}
        <div className="mb-8 flex justify-center gap-3">
          <ContextButton active={contextType === 'food'} onClick={() => setContextType('food')} icon={Utensils} label="Food & Nutrition" color="#10c7a1" />
          <ContextButton active={contextType === 'finance'} onClick={() => setContextType('finance')} icon={Receipt} label="Receipts & Bills" color="#c8a84b" />
          <ContextButton active={contextType === 'medical'} onClick={() => setContextType('medical')} icon={Activity} label="Medical Reports" color="#ff4d7d" />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* --- 2. Uploader Area --- */}
          <div className="flex flex-col gap-4">
            <div 
              onDragOver={handleDragOver} 
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-80 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-[#7b61ff]/50 hover:bg-white/10"
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])} />
              
              <AnimatePresence mode="wait">
                {preview ? (
                  <motion.img 
                    key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    src={preview} alt="Preview" className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                ) : (
                  <motion.div key="placeholder" className="flex flex-col items-center text-white/40">
                    <FileText className="mb-4 h-12 w-12" />
                    <p className="font-semibold">Drag & drop an image</p>
                    <p className="text-xs">or click to browse</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {file && (
              <div className="flex gap-3">
                <button onClick={clearSelection} disabled={isAnalyzing} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-50">
                  Clear
                </button>
                <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7b61ff] px-4 py-3 font-bold shadow-lg transition hover:bg-[#6345ed] disabled:opacity-50">
                  {isAnalyzing ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</> : <><Sparkles className="h-5 w-5" /> Analyze Image</>}
                </button>
              </div>
            )}
          </div>

          {/* --- 3. Results Area --- */}
          <div className="flex flex-col">
            <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f1320]/80 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <CheckCircle className="h-5 w-5 text-[#7df3cc]" /> Extracted Data
              </h2>

              {!result && !isAnalyzing && (
                <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
                  Waiting for image upload...
                </div>
              )}

              {isAnalyzing && (
                <div className="flex h-full flex-col items-center justify-center text-[#7b61ff]">
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <p className="mt-4 animate-pulse text-sm font-semibold">Gemini AI is processing...</p>
                </div>
              )}

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-4 overflow-y-auto">
                  {contextType === 'food' && <ResultRow label="Food Name" value={result.foodName} />}
                  {contextType === 'finance' && <ResultRow label="Vendor" value={result.vendorName} />}
                  {contextType === 'medical' && <ResultRow label="Document Type" value={result.documentType} />}

                  <div className="grid grid-cols-2 gap-3">
                    {contextType === 'food' && (
                      <>
                        <ResultBox label="Calories" value={`${result.calories} kcal`} color="#10c7a1" />
                        <ResultBox label="Protein" value={`${result.protein}g`} color="#3b82f6" />
                        <ResultBox label="Carbs" value={`${result.carbs}g`} color="#f59e0b" />
                        <ResultBox label="Fat" value={`${result.fat}g`} color="#ef4444" />
                      </>
                    )}
                    {contextType === 'finance' && (
                      <>
                        <ResultBox label="Amount" value={`₹${result.totalAmount}`} color="#c8a84b" />
                        <ResultBox label="Category" value={result.category} color="#7b61ff" />
                      </>
                    )}
                  </div>

                  {contextType === 'medical' && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Deficiencies Detected</p>
                        {result.detectedDeficiencies?.map((d, i) => <div key={i} className="text-sm text-[#ff4d7d]">• {d}</div>) || 'None detected'}
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Medications</p>
                        {result.medications?.map((m, i) => <div key={i} className="text-sm text-[#10c7a1]">• {m}</div>) || 'None found'}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto rounded-xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#7b61ff] mb-1">AI Observation</p>
                    <p className="text-sm text-white/90">{result.advice || (contextType === 'finance' ? result.type : '')}</p>
                  </div>

                  <button 
                    onClick={handleSaveToDashboard}
                    disabled={isSaving}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#10c7a1] to-[#7df3cc] py-4 font-bold text-black shadow-[0_0_20px_rgba(16,199,161,0.3)] transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,199,161,0.5)] disabled:opacity-50"
                  >
                    {isSaving ? 'Syncing to Twin...' : 'Save to Dashboard & Claim XP'}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* --- 4. Conversational Cross-Domain Oracle Terminal --- */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0c1018]/90 p-6 shadow-2xl backdrop-blur-xl">
          <header className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-[#7b61ff]/20 p-2 text-[#7b61ff]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Ask Your Twin Copilot</h2>
              <p className="text-xs text-white/50">Simulate choices across Gold investments, health anomalies, or cycle alignments.</p>
            </div>
          </header>

          <form onSubmit={handleAskOracle} className="flex gap-3 items-center">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isListening ? "Listening closely... Speak your mind now." : "e.g., Should I buy gold right now, or should I reallocate to index funds based on my targets?"}
                className={`w-full rounded-xl border p-4 pr-14 text-sm text-white placeholder-white/30 bg-white/5 focus:outline-none transition-colors ${isListening ? 'border-[#ff4d7d]/50 bg-[#ff4d7d]/5 shadow-[0_0_15px_rgba(255,77,125,0.2)]' : 'border-white/10 focus:border-[#7b61ff]'}`}
                disabled={isConsulting}
              />
              <button
                type="button"
                onClick={toggleListening}
                disabled={isConsulting}
                className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg transition-all ${isListening ? 'bg-[#ff4d7d] text-white animate-pulse' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                title={isListening ? "Stop listening" : "Talk to Ask Question"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>

            <button 
              type="submit"
              disabled={isConsulting || isListening}
              className="rounded-xl bg-[#7b61ff] px-6 py-4 font-bold text-white shadow-lg transition hover:bg-[#6345ed] disabled:opacity-50 whitespace-nowrap"
            >
              {isConsulting ? 'Calculating Paths...' : 'Simulate Decision'}
            </button>
          </form>

          {/* Gamified JSON Render Matrix */}
          {chatResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
              
              {/* Verdict Card */}
              <div className={`relative overflow-hidden rounded-xl border ${getRiskStyles(chatResponse.riskLevel).border} ${getRiskStyles(chatResponse.riskLevel).bg} p-6`}>
                <div className="absolute right-4 top-4">
                  <button 
                    onClick={() => handleSpeak(chatResponse.verdict + ". " + chatResponse.action)}
                    className={`flex items-center justify-center rounded-full p-2 transition ${getRiskStyles(chatResponse.riskLevel).text} hover:bg-white/10`}
                    title={isSpeaking ? "Stop Voice" : "Read Aloud"}
                  >
                    {isSpeaking ? <StopCircle className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
                
                <h3 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${getRiskStyles(chatResponse.riskLevel).text} mb-2`}>
                  <AlertTriangle className="h-5 w-5" /> Copilot Verdict
                </h3>
                <p className="pr-12 text-lg font-semibold leading-relaxed text-white">
                  {chatResponse.verdict}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Cascading Impacts */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7b61ff]">Cross-Domain Impacts</h3>
                  <div className="space-y-3">
                    {chatResponse.impacts?.map((impact, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="mt-1 rounded bg-white/10 p-1">
                          {impact.domain.toLowerCase() === 'health' ? <Activity className="h-3 w-3 text-[#ff4d7d]" /> : 
                           impact.domain.toLowerCase() === 'finance' ? <DollarSign className="h-3 w-3 text-[#10c7a1]" /> :
                           <BrainCircuit className="h-3 w-3 text-[#c8a84b]" />}
                        </div>
                        <p className="text-sm text-white/80"><strong className="text-white">{impact.domain}:</strong> {impact.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Immediate Action */}
                <div className="rounded-xl border border-[#10c7a1]/30 bg-gradient-to-br from-[#11131a] to-[#10c7a1]/10 p-5 flex flex-col justify-center">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#10c7a1]">
                    <Zap className="h-4 w-4" /> Recommended Action
                  </h3>
                  <p className="text-base text-white/90">
                    {chatResponse.action}
                  </p>
                </div>
              </div>

            </motion.div>
          )}
        </section>

      </div>
    </div>
  );
}

function ContextButton({ active, onClick, icon: Icon, label, color }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${active ? 'bg-white/10 shadow-lg' : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white'}`}
      style={{ border: active ? `1px solid ${color}` : '1px solid transparent', color: active ? color : undefined }}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
      <span className="text-sm font-medium text-white/50">{label}</span>
      <span className="text-lg font-bold text-white">{value || 'Unknown'}</span>
    </div>
  );
}

function ResultBox({ label, value, color }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 text-center border-b-2" style={{ borderBottomColor: color }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value || '0'}</p>
    </div>
  );
}