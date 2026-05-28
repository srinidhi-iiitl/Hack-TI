import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';
import { Moon, Wallet, Heart, Sparkles, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function DailySyncModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { triggerReward } = useGamification();

  // Form States
  const [sleepTime, setSleepTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [amountCredited, setAmountCredited] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [spendCategory, setSpendCategory] = useState('');

  // Check if user already completed their sync today
  useEffect(() => {
    const lastSync = localStorage.getItem('lastDailySyncDate');
    const todayStr = new Date().toDateString();
    if (lastSync !== todayStr) {
      setIsOpen(true); // Open modal automatically if they haven't synced today
    }
  }, []);

  const handleFinishSync = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Send the daily intercept data to your server
      const response = await axios.post(`${API_BASE_URL}/api/gamification/daily-sync`, {
        sleepTime,
        wakeTime,
        amountCredited: Number(amountCredited) || 0,
        amountSpent: Number(amountSpent) || 0,
        spendCategory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        localStorage.setItem('lastDailySyncDate', new Date().toDateString());
        setIsOpen(false);

        // Award massive daily bonus XP!
        if (response.data.gamification) {
          triggerReward(
            response.data.gamification.xpAwarded,
            response.data.gamification.newBadges,
            response.data.gamification.newTotalXP
          );
        }
      }
    } catch (error) {
      console.error('Failed to log daily sync:', error);
      setIsOpen(false); // Fallback to close modal gracefully
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#05070d]/80 px-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0f1320]/95 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {/* Close Button */}
          <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>

          {/* Top Quest Header */}
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-xl bg-[#10c7a1]/10 p-2 text-[#10c7a1]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#10c7a1]">Daily Milestone Quest</h3>
              <p className="text-xs text-white/60">Complete your morning data sync loop</p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= i ? 'bg-gradient-to-r from-[#10c7a1] to-[#7df3cc]' : 'bg-white/10'}`} />
            ))}
          </div>

          {/* Steps Carousel */}
          <form onSubmit={(e) => e.preventDefault()}>
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Moon className="h-6 w-6 text-[#7b61ff]" />
                  <h4 className="text-xl font-semibold">Circadian Rhythm Check</h4>
                </div>
                <p className="text-sm text-white/60">Let's calculate your recovery matrices and cognitive capacity logs.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Slept At</label>
                    <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Woke Up At</label>
                    <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" />
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="w-full mt-4 rounded-xl bg-[#7b61ff] py-3 font-bold text-white shadow-lg transition hover:bg-[#6345ed]">
                  Next Vector
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-[#c8a84b]" />
                  <h4 className="text-xl font-semibold">Ledger & Capital Sync</h4>
                </div>
                <p className="text-sm text-white/60">Map today's baseline velocity. Leave blank if no transactions have happened yet.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Money Credited (₹)</label>
                    <input type="number" placeholder="0" value={amountCredited} onChange={(e) => setAmountCredited(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Money Spent (₹)</label>
                      <input type="number" placeholder="0" value={amountSpent} onChange={(e) => setAmountSpent(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Category</label>
                      <select value={spendCategory} onChange={(e) => setSpendCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f1320] p-3 text-white focus:border-[#c8a84b] focus:outline-none">
                        <option value="">Select...</option>
                        <option value="food">Food Delivery</option>
                        <option value="medical">Medical / Health</option>
                        <option value="rent">Rent / Bills</option>
                        <option value="entertainment">Luxury / Entertainment</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(1)} className="w-1/3 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold transition hover:bg-white/10">Back</button>
                  <button onClick={() => setStep(3)} className="w-2/3 rounded-xl bg-[#c8a84b] py-3 font-bold text-black shadow-lg transition hover:bg-[#b0923b]">Next Vector</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="h-6 w-6 text-[#10c7a1]" />
                  <h4 className="text-xl font-semibold">Initialize Twin Synchronization</h4>
                </div>
                <p className="text-sm text-white/60">Finalizing alignment patterns. Pushing inputs to your digital counterpart awards a high multiplier bonus.</p>
                <div className="rounded-2xl border border-[#10c7a1]/20 bg-[#10c7a1]/5 p-4 text-center">
                  <p className="text-sm text-[#7df3cc] font-bold">✨ Multiplier Bonus Active</p>
                  <p className="text-2xl font-black text-white mt-1">+50 XP Reward</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(2)} className="w-1/3 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold transition hover:bg-white/10">Back</button>
                  <button onClick={handleFinishSync} className="w-2/3 rounded-xl bg-gradient-to-r from-[#10c7a1] to-[#7df3cc] py-3 font-bold text-black shadow-lg hover:shadow-[0_0_20px_rgba(16,199,161,0.4)] transition">
                    Sync Twin & Claim XP
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}