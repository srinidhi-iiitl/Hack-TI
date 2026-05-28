import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';
import { Target, Activity, DollarSign, Briefcase, Calendar, Flag, PlusCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const glassCardClass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { triggerReward } = useGamification();

  // Form States
  const [domain, setDomain] = useState('health');
  const [title, setTitle] = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setGoals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/api/goals`, {
        domain, title, targetMetric: Number(targetMetric), unit, deadline, priority
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        setGoals([...goals, response.data.data]);
        setIsFormOpen(false);
        setTitle(''); setTargetMetric(''); setUnit(''); setDeadline('');
        
        if (response.data.gamification) {
          triggerReward(
            response.data.gamification.xpAwarded, 
            response.data.gamification.newBadges, 
            response.data.gamification.newTotalXP
          );
        }
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,77,125,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,199,161,0.1),transparent_30%)]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">S.M.A.R.T Goals</h1>
            <p className="mt-2 text-white/60">Cross-domain milestone tracking integrated directly into your AI Oracle.</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 rounded-xl bg-[#7b61ff] px-6 py-3 font-bold shadow-lg transition hover:bg-[#6345ed]"
          >
            <PlusCircle className="h-5 w-5" /> New Objective
          </button>
        </header>

        {isFormOpen && (
          <section className={`mb-8 ${glassCardClass} p-6 border-[#7b61ff]/30`}>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2 text-[#7b61ff]">
              <Target className="h-5 w-5" /> Define New Parameters
            </h2>
            <form onSubmit={handleCreateGoal} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
              <div>
                <label className="mb-1 block text-xs uppercase text-white/60">Domain</label>
                <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
                  <option value="health">Health & Wellness</option>
                  <option value="finance">Wealth & Finance</option>
                  <option value="career">Career & Learning</option>
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs uppercase text-white/60">Goal Title</label>
                <input type="text" placeholder="e.g., Save for house downpayment" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" required />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-white/60">Target Number</label>
                <input type="number" placeholder="e.g., 10000" value={targetMetric} onChange={(e) => setTargetMetric(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" required />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-white/60">Unit</label>
                <input type="text" placeholder="e.g., USD, kg, chapters" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" required />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-white/60">Target Deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" required />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase text-white/60">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-2">
                <button type="submit" className="w-full rounded-lg bg-gradient-to-r from-[#7b61ff] to-[#10c7a1] px-6 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01]">
                  Initialize Objective & Earn XP
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map(goal => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
          {goals.length === 0 && !isFormOpen && (
            <div className="col-span-full py-12 text-center text-white/50 border border-dashed border-white/20 rounded-2xl">
              No objectives mapped. Initialize a health or finance goal to power up your Copilot AI.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal }) {
  const getDomainStyles = (domain) => {
    switch(domain) {
      case 'health': return { icon: Activity, color: '#ff4d7d', bg: 'bg-[#ff4d7d]/10', border: 'border-[#ff4d7d]/30' };
      case 'finance': return { icon: DollarSign, color: '#10c7a1', bg: 'bg-[#10c7a1]/10', border: 'border-[#10c7a1]/30' };
      case 'career': return { icon: Briefcase, color: '#c8a84b', bg: 'bg-[#c8a84b]/10', border: 'border-[#c8a84b]/30' };
      default: return { icon: Target, color: '#7b61ff', bg: 'bg-[#7b61ff]/10', border: 'border-[#7b61ff]/30' };
    }
  };

  const style = getDomainStyles(goal.domain);
  const Icon = style.icon;
  const progressPercent = Math.min(Math.round((goal.currentMetric / goal.targetMetric) * 100), 100);

  return (
    <article className={`${glassCardClass} flex flex-col justify-between p-6 transition-transform hover:-translate-y-1`}>
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div className={`rounded-xl p-3 ${style.bg} text-[${style.color}]`} style={{ color: style.color }}>
            <Icon className="h-6 w-6" />
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${goal.priority === 'high' ? 'border-[#ff4d7d] text-[#ff4d7d]' : 'border-white/20 text-white/60'}`}>
            {goal.priority} Priority
          </span>
        </div>
        <h3 className="mb-1 text-lg font-bold">{goal.title}</h3>
        
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-white/60">Progress</span>
            <span style={{ color: style.color }}>{goal.currentMetric} / {goal.targetMetric} {goal.unit}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div 
              className="h-full rounded-full transition-all duration-1000" 
              style={{ width: `${progressPercent}%`, backgroundColor: style.color }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-semibold text-white/50">
        <Calendar className="h-4 w-4" /> Target: {new Date(goal.deadline).toLocaleDateString()}
      </div>
    </article>
  );
}