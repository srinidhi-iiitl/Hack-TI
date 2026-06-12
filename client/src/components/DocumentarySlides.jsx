import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getPatternStyles = (patternClass) => {
  switch (patternClass) {
    case 'polka-dots':
      return {
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)',
        backgroundSize: '16px 16px',
      };
    case 'cyber-grid':
      return {
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    case 'neon-waves':
      return {
        backgroundImage: 'radial-gradient(circle at 100% 150%, transparent 24%, rgba(255,255,255,0.02) 24%, rgba(255,255,255,0.02) 28%, transparent 28%, transparent), radial-gradient(circle at 0% 150%, transparent 24%, rgba(255,255,255,0.02) 24%, rgba(255,255,255,0.02) 28%, transparent 28%, transparent)',
        backgroundSize: '40px 40px',
      };
    default:
      return {};
  }
};

export default function DocumentarySlides({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const token = localStorage.getItem('authToken');
  const navigate = useNavigate();

  // Load documentary logs and archetype on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchDocumentary = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/intelligence/documentary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setData(res.data.data);
          setCurrentIdx(0);
        }
      } catch (err) {
        console.error('Failed to load documentary logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentary();
  }, [isOpen, token]);

  // Handle 6-second auto-advancing slide timer
  useEffect(() => {
    if (!isOpen || !data?.slides || data.slides.length === 0 || loading) return;

    setProgress(0);
    const duration = 6000; // 6 seconds slide progress
    const intervalTime = 50; 
    const step = (100 / (duration / intervalTime));

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return p + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, data, currentIdx, loading]);

  const handleNext = () => {
    if (data?.slides && currentIdx < data.slides.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSyncToCopilot = () => {
    if (!data?.slides || data.slides.length < 4) return;
    const blueprintText = `My 2027 Evolution Blueprint: ${data.slides[3].narrative}`;
    localStorage.setItem('copilotPresetPrompt', blueprintText);
    navigate('/copilot');
    onClose();
  };

  if (!isOpen) return null;

  const slides = data?.slides || [];
  const currentSlide = slides[currentIdx];
  const accentColor = currentSlide ? currentSlide.visualTheme.accentColor : '#a855f7';
  const patternStyle = currentSlide ? getPatternStyles(currentSlide.visualTheme.bgPatternClass) : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020308]/98 p-0 sm:p-4">
      {/* 1. Background Gradient (Fades in smoothly) */}
      <AnimatePresence mode="wait">
        {currentSlide && (
          <motion.div
            key={`bg-${currentIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`absolute inset-0 bg-gradient-to-tr ${currentSlide.visualTheme.bgGradient} transition-all duration-700`}
          />
        )}
      </AnimatePresence>

      {/* Main Slide Card Container (Full-bleed viewport story modal) */}
      <div 
        className="relative w-full max-w-[500px] aspect-[9/16] max-h-[100vh] sm:max-h-[85vh] border rounded-none sm:rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-2xl p-6 z-10 transition-colors duration-500 bg-[#000000]/10 backdrop-blur-sm"
        style={{ borderColor: `${accentColor}25` }}
      >
        {/* Dynamic Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-500 z-0"
          style={patternStyle}
        />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
            <span className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin" style={{ borderTopColor: accentColor }} />
            <h3 className="text-lg font-bold text-white tracking-tight animate-pulse">
              Compiling Personal Documentary...
            </h3>
            <p className="text-xs text-gray-500">Structuring chronological chapters.</p>
          </div>
        ) : !currentSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4 relative z-10">
            <AlertTriangle className="h-10 w-10 text-amber-500 animate-bounce" />
            <h3 className="text-lg font-bold text-white">Chronicle Awaiting Data</h3>
            <p className="text-xs text-gray-400">Please establish standard data integrations or enter logs to launch documentary slides.</p>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-xs">Close</button>
          </div>
        ) : (
          <>
            {/* Top Viewport progress indicators */}
            <div className="flex gap-1.5 w-full mb-6 pointer-events-none relative z-30">
              {slides.map((slide, idx) => (
                <div key={slide.slideId} className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: idx < currentIdx ? '100%' : idx === currentIdx ? `${progress}%` : '0%',
                      background: accentColor,
                      transitionDuration: idx === currentIdx ? '50ms' : '0ms'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Slide Header & Close Button */}
            <div className="flex items-center justify-between w-full relative z-30">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40">
                <Sparkles className="h-3.5 w-3.5" style={{ color: accentColor }} /> Personal Documentary
              </span>
              <button 
                onClick={onClose} 
                className="h-7 w-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Slide Body */}
            <div className="flex-1 flex flex-col justify-center relative my-6 z-20">
              {/* Transparent Navigation zones (left 30% / right 70%) */}
              <div className="absolute inset-y-0 left-0 w-[30%] cursor-w-resize z-35" onClick={handlePrev} />
              <div className="absolute inset-y-0 right-0 w-[70%] cursor-e-resize z-35" onClick={handleNext} />

              <div className="space-y-6 select-none relative z-10">
                {/* 2. Slide Subtitle / Chapter (fades in) */}
                <motion.div
                  key={`chapter-${currentIdx}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex flex-col gap-1"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {currentSlide.chapter}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: accentColor }}>
                    {currentSlide.title}
                  </span>
                </motion.div>

                {/* 3. Focus Stat (spring-animated scale scaling effect) */}
                <div className="overflow-visible py-2">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={`focus-${currentIdx}`}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
                      className="text-4xl font-black tracking-tighter leading-none text-white drop-shadow-md origin-left"
                    >
                      {currentSlide.focusStat}
                    </motion.h2>
                  </AnimatePresence>
                </div>

                {/* 4. Narrative Block (smooth slide-up) */}
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`narrative-${currentIdx}`}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.6 }}
                      className="text-gray-300 text-sm leading-relaxed font-semibold pr-2"
                    >
                      {currentSlide.narrative}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* 5. Resolution Action Button (Only on final slide) */}
                {currentIdx === slides.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="pt-2 relative z-40"
                  >
                    <button
                      onClick={handleSyncToCopilot}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-extrabold text-xs hover:bg-white/90 transition-all shadow-lg shadow-black/35 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" /> Sync Blueprint to Copilot
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Slide Footer */}
            <div className="flex justify-between items-center w-full relative z-30 border-t border-white/5 pt-4">
              <button 
                onClick={handlePrev} 
                disabled={currentIdx === 0}
                className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider transition-all ${currentIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-white/50 hover:text-white cursor-pointer'}`}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>

              <button 
                onClick={handleNext}
                className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white cursor-pointer"
              >
                {currentIdx === slides.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
