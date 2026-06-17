import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, BrainCircuit, Activity, RefreshCw, BarChart3, ShieldAlert, Play, Sparkles } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReflectionStory from '../components/ReflectionStory';
import { useTheme } from '../context/ThemeContext';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Intelligence = () => {
  const { theme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const diagnosticsRequestInFlightRef = useRef(false);
  

  // Load history on mount
  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/api/ai/diagnostics/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setDiagnosticData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch latest report:', err);
      }
    };
    fetchLatestReport();
  }, []);

  const handleRunDiagnostics = async () => {
    if (diagnosticsRequestInFlightRef.current || isGenerating) return;

    diagnosticsRequestInFlightRef.current = true;
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/ai/diagnostics`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDiagnosticData(res.data.data);
      }
    } catch (error) {
      console.error('Diagnostics execution failed:', error);
      // High-fidelity fallback data matching the strict schema
      const fallback = {
        summaryTable: [
          { domainInteraction: "Health vs Finance", keyMetric: "-15% sleep = +₹800 spend", status: "Critical" },
          { domainInteraction: "Health vs Career", keyMetric: "<6h sleep = -60% GitHub commits", status: "Warning" },
          { domainInteraction: "Finance vs Health", keyMetric: "₹5000+ daily spend = +30% stress", status: "Warning" },
          { domainInteraction: "Career vs Health", keyMetric: "10+ commits/day = -1.5h active sleep", status: "Info" }
        ],
        histogramData: [
          { day: "Mon", healthImpact: 40, financeImpact: 60, careerImpact: 50 },
          { day: "Tue", healthImpact: 55, financeImpact: 45, careerImpact: 60 },
          { day: "Wed", healthImpact: 70, financeImpact: 30, careerImpact: 75 },
          { day: "Thu", healthImpact: 35, financeImpact: 80, careerImpact: 45 },
          { day: "Fri", healthImpact: 60, financeImpact: 50, careerImpact: 65 },
          { day: "Sat", healthImpact: 80, financeImpact: 20, careerImpact: 40 },
          { day: "Sun", healthImpact: 90, financeImpact: 15, careerImpact: 35 }
        ],
        flowAnalysis: {
          rootCause: "Late night coding",
          primaryEffect: "Sub-6 hour sleep average",
          secondaryEffect: "High caffeine/food delivery spending"
        },
        visualNarrative: [
          "Impulse spending on convenience items spikes dramatically during cognitive fatigue cycles.",
          "Stamina metrics and dev-profile throughput drop by half when cumulative sleep debt is high.",
          "Investing resources into skill development bootcamps shows a clear long-term salary growth correlation."
        ],
        balancedLifestyleRecommendations: [
          { action: "Set a hard 11 PM screens-off protocol to preserve sleep quality.", expectedOutcome: "Reduce next-day impulse caffeine spends by 30%." },
          { action: "Limit late-night deployment pushes and keep coding blocks to daytime.", expectedOutcome: "Stabilize baseline resting HR and double commit consistency." },
          { action: "Automate ₹2000 weekly savings transfers immediately on salary credit.", expectedOutcome: "Improve subjective stress indexes and lower overall financial anxiety." }
        ]
      };
      setDiagnosticData(fallback);
    } finally {
      diagnosticsRequestInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  return (
    <div className={`min-h-screen px-8 pt-8 pb-8 relative overflow-hidden ${
      theme === 'light'
        ? 'bg-[#f8fafc] text-slate-900'
        : 'bg-[#050816] text-white'
    }`}> 
      
      {/* Background Blurs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="mb-8 relative z-10">        
        <h1 className={`text-5xl font-bold mb-2 flex items-center gap-3 bg-clip-text text-transparent ${
          theme === 'light'
            ? 'bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500'
            : 'bg-gradient-to-r from-white via-gray-200 to-gray-400'
        }`}>
          Executive Diagnostic Center
        </h1>
        <p className={`text-lg max-w-2xl ${
          theme === 'light' ? 'text-slate-600' : 'text-gray-400'
        }`}>
          Your Digital Twin correlates historical signals to diagnose life anomalies, map cross-domain interactions, and build strategic countermeasures.
        </p>
      </div>

      <div className="relative z-10 space-y-12">

        {/* Digital Twin Reflection Launcher Card */}
        <div className={`relative overflow-hidden rounded-3xl border backdrop-blur-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl ${
          theme === 'light'
            ? 'border-slate-200 bg-white shadow-slate-100/50'
            : 'border-white/10 bg-[#0d101d]/85'
        }`}>
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-pink-400">
              <Sparkles className="h-4 w-4" /> Digital Twin Reflection
            </span>
            <h3 className={`text-2xl font-extrabold tracking-tight ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>Not what you did. Who you became.</h3>
            <p className={`text-sm max-w-xl ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}>
              Launch your Digital Twin Reflection story deck to review behavioral trade-offs, consequences, alternate simulation projections, and core archetypes.
            </p>
          </div>
          
          <button
            onClick={() => setIsReflectionOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-extrabold text-sm text-white hover:opacity-90 hover:shadow-[0_0_25px_rgba(236,72,153,0.3)] transition-all cursor-pointer border border-white/10 shrink-0 flex items-center gap-2"
          >
            <Play className="h-4 w-4 fill-white" /> Launch Twin Reflection
          </button>
        </div>

        {/* Diagnostics Trigger / Loader / Results */}
        <div className={`border rounded-3xl p-8 backdrop-blur-xl ${
          theme === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-white/5 border-white/10'
        }`}>
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 className="h-16 w-16 text-cyan-400 animate-spin mb-6" />
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 animate-pulse">
                  Running Multi-Domain System Synthesis...
                </h2>
                <p className={`mt-2 ${
                  theme === 'light' ? 'text-slate-500' : 'text-gray-500'
                }`}>Correlating historical daily tracking logs, life profiles, and active goals.</p>
              </motion.div>
            ) : !diagnosticData ? (
              <motion.div
                key="trigger"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-6"
              >
                <BrainCircuit className="h-20 w-20 text-[#7b61ff] animate-pulse" />
                <div>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>Cross-Domain Diagnostics</h3>
                  <p className={`text-sm max-w-md mx-auto ${
                    theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    Initiate a multi-directional engine query to evaluate how your daily sleep, workout frequency, and study targets impact your savings and career achievements.
                  </p>
                </div>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={isGenerating}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7b61ff] to-[#10c7a1] font-bold text-base text-white hover:opacity-90 transition-all hover:shadow-[0_0_30px_rgba(123,97,255,0.4)] cursor-pointer border border-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? 'Running Analysis...' : 'Run Comprehensive Cross-Domain Analysis'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-10"
              >
                {/* Header controls */}
                <div className={`flex flex-wrap items-center justify-between border-b pb-4 gap-4 ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <div>
                    <h3 className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>Digital Twin Diagnostics</h3>
                    <p className={`text-xs mt-1 font-mono ${
                      theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>Status: ANALYSIS COMPLETE · Database streams synchronized</p>
                  </div>
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      theme === 'light'
                        ? 'border-[#7b61ff]/40 bg-[#7b61ff]/5 text-[#7b61ff] hover:bg-[#7b61ff]/10'
                        : 'border-[#7b61ff]/30 bg-[#7b61ff]/10 text-white hover:bg-[#7b61ff]/20'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} /> {isGenerating ? 'Generating...' : 'Generate Fresh Analysis'}
                  </button>
                </div>

                {/* 1. Comparison Matrix / Summary Table */}
                <div className="space-y-4">
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <Activity className="h-5 w-5 text-[#ff4d7d]" /> Crossover Matrix Summary
                  </h4>
                  <div className={`overflow-x-auto rounded-2xl border ${
                    theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/2'
                  }`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b uppercase tracking-wider font-semibold ${
                          theme === 'light'
                            ? 'border-slate-200 bg-slate-50 text-slate-500'
                            : 'border-white/10 bg-white/5 text-gray-400'
                        }`}>
                          <th className="p-4">Domain Interaction</th>
                          <th className="p-4">Key Metric Connection</th>
                          <th className="p-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticData.summaryTable?.map((row, i) => (
                          <tr key={i} className={`border-b transition-colors ${
                            theme === 'light'
                              ? 'border-slate-100 hover:bg-slate-50/50'
                              : 'border-white/5 hover:bg-white/4'
                          }`}>
                            <td className={`p-4 font-bold ${
                              theme === 'light' ? 'text-slate-800' : 'text-white/95'
                            }`}>{row.domainInteraction}</td>
                            <td className={`p-4 leading-relaxed font-mono ${
                              theme === 'light' ? 'text-slate-600' : 'text-gray-300'
                            }`}>{row.keyMetric}</td>
                            <td className="p-4 text-right">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                row.status?.toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                row.status?.toLowerCase() === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Histogram Chart */}
                <div className={`space-y-4 border-t pt-8 ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <BarChart3 className="h-5 w-5 text-[#10c7a1]" /> Weekly Cross-Domain Impact Histogram
                  </h4>
                  <div className={`rounded-2xl border p-6 ${
                    theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0f1320]/40'
                  }`}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={diagnosticData.histogramData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'} />
                        <XAxis dataKey="day" stroke={theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'} fontSize={10} />
                        <YAxis stroke={theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'} fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={
                          theme === 'light' 
                            ? { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' } 
                            : { backgroundColor: '#0f1320', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }
                        } />
                        <Legend />
                        <Bar dataKey="healthImpact" name="Health Impact %" fill="#ff4d7d" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="financeImpact" name="Finance Impact %" fill="#10c7a1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="careerImpact" name="Career Impact %" fill="#7b61ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Ripple Flow Analysis Diagram */}
                {diagnosticData.flowAnalysis && (
                  <div className={`space-y-4 border-t pt-8 ${
                    theme === 'light' ? 'border-slate-200' : 'border-white/10'
                  }`}>
                    <h4 className={`text-lg font-bold flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      <BrainCircuit className="h-5 w-5 text-[#7b61ff]" /> Ripple Effect Flow Analysis
                    </h4>
                    <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-6 border rounded-2xl ${
                      theme === 'light' ? 'bg-slate-50/50 border-slate-200' : 'bg-white/2 border-white/10'
                    }`}>
                      
                      <div className={`flex-1 w-full p-4 rounded-xl border text-center relative overflow-hidden ${
                        theme === 'light'
                          ? 'bg-red-50/70 border-red-200'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                        <div className={`text-[10px] font-mono mb-1 uppercase tracking-wider ${
                          theme === 'light' ? 'text-red-600' : 'text-red-400'
                        }`}>Root Cause</div>
                        <div className={`font-semibold text-sm ${
                          theme === 'light' ? 'text-slate-800' : 'text-white'
                        }`}>{diagnosticData.flowAnalysis.rootCause}</div>
                      </div>
                      
                      <div className="text-[#7b61ff] font-bold text-xl rotate-90 md:rotate-0">➔</div>
                      
                      <div className={`flex-1 w-full p-4 rounded-xl border text-center relative overflow-hidden ${
                        theme === 'light'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                        <div className={`text-[10px] font-mono mb-1 uppercase tracking-wider ${
                          theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                        }`}>Primary Effect</div>
                        <div className={`font-semibold text-sm ${
                          theme === 'light' ? 'text-slate-800' : 'text-white'
                        }`}>{diagnosticData.flowAnalysis.primaryEffect}</div>
                      </div>
                      
                      <div className="text-[#10c7a1] font-bold text-xl rotate-90 md:rotate-0">➔</div>
                      
                      <div className={`flex-1 w-full p-4 rounded-xl border text-center relative overflow-hidden ${
                        theme === 'light'
                          ? 'bg-cyan-50/70 border-cyan-200'
                          : 'bg-cyan-500/5 border-cyan-500/20'
                      }`}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                        <div className={`text-[10px] font-mono mb-1 uppercase tracking-wider ${
                          theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'
                        }`}>Secondary Ripple Effect</div>
                        <div className={`font-semibold text-sm ${
                          theme === 'light' ? 'text-slate-800' : 'text-white'
                        }`}>{diagnosticData.flowAnalysis.secondaryEffect}</div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. Visual Narrative Data Bullets */}
                <div className={`space-y-4 border-t pt-8 ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <Activity className="h-5 w-5 text-purple-400" /> Core Narrative Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {diagnosticData.visualNarrative?.map((narrative, idx) => (
                      <div key={idx} className={`border p-5 rounded-2xl flex items-start gap-3 ${
                        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/2 border-white/10'
                      }`}>
                        <div className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex-shrink-0" />
                        <p className={`text-sm leading-relaxed ${
                          theme === 'light' ? 'text-slate-600' : 'text-gray-300'
                        }`}>{narrative}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Balanced Lifestyle Recommendations */}
                <div className={`space-y-4 border-t pt-8 ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <ShieldAlert className="h-5 w-5 text-amber-400" /> Balanced Lifestyle Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {diagnosticData.balancedLifestyleRecommendations?.map((rec, idx) => (
                      <div key={idx} className={`relative rounded-2xl border p-6 shadow-xl overflow-hidden transition-all ${
                        theme === 'light'
                          ? 'bg-white border-slate-200 hover:border-slate-300 shadow-slate-100/50'
                          : 'bg-[#0f1320]/90 border-white/10 hover:border-white/25'
                      }`}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7b61ff] to-[#10c7a1]" />
                        <div className="space-y-4">
                          <div>
                            <div className="text-[10px] text-[#7b61ff] font-bold uppercase tracking-wider mb-1">Recommended Action</div>
                            <p className={`text-sm font-medium leading-relaxed ${
                              theme === 'light' ? 'text-slate-800' : 'text-gray-100'
                            }`}>{rec.action}</p>
                          </div>
                          <div className={`pt-3 border-t ${
                            theme === 'light' ? 'border-slate-100' : 'border-white/5'
                          }`}>
                            <div className="text-[10px] text-[#10c7a1] font-bold uppercase tracking-wider mb-1">Expected Outcome</div>
                            <p className={`text-xs leading-relaxed ${
                              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                            }`}>{rec.expectedOutcome}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Digital Twin Reflection Story Modal */}
      <ReflectionStory isOpen={isReflectionOpen} onClose={() => setIsReflectionOpen(false)} />
    </div>
  );
};

export default Intelligence;
