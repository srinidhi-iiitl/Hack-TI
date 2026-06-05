import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboardSync } from '../context/DashboardSyncContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function DocumentUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const fileInputRef = useRef(null);
  const { refreshDashboard } = useDashboardSync();

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/api/ai/uploads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching upload history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    window.addEventListener('upload-history-updated', fetchHistory);
    return () => window.removeEventListener('upload-history-updated', fetchHistory);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const toastId = toast.loading(`Uploading & extracting ${file.name}...`);

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/ai/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        toast.success(`Successfully sync'd ${file.name}!`, { id: toastId });
        refreshDashboard();
        fetchHistory();
      } else {
        toast.error(res.data.message || 'Failed to extract data.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error processing document.', { id: toastId });
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDomainBadge = (domain) => {
    switch (domain) {
      case 'health': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'finance': return 'text-[#c8a84b] bg-[#c8a84b]/10 border-[#c8a84b]/20';
      case 'career': return 'text-[#7b61ff] bg-[#7b61ff]/10 border-[#7b61ff]/20';
      default: return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  const renderExtractedData = (upload) => {
    const { domain, extractedData } = upload;
    if (!extractedData) return null;

    if (domain === 'finance') {
      const fin = extractedData.financeData || {};
      const isMF = extractedData.subType === 'mutual_fund';
      return (
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-white/80">
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Financial Summary</div>
            {isMF ? (
              <div className="space-y-1">
                <div>Portfolio Value: <span className="font-bold text-white">₹{(fin.portfolioValue || 0).toLocaleString()}</span></div>
                <div>Returns: <span className="font-bold text-[#c8a84b]">{fin.returns}%</span></div>
              </div>
            ) : (
              <div className="space-y-1">
                <div>Money Spent: <span className="font-bold text-[#ff4d7d]">₹{fin.moneySpent || 0}</span></div>
                <div>Money Credited: <span className="font-bold text-emerald-400">₹{fin.moneyCredited || 0}</span></div>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">
              {isMF ? 'Mutual Fund Holdings' : 'Bank Transactions'}
            </div>
            {isMF ? (
              <div className="space-y-1">
                {fin.holdings?.map((h, i) => (
                  <div key={i} className="truncate text-xs">• {h.assetName} ({h.shares} units) - ₹{h.value?.toLocaleString()}</div>
                )) || <div className="text-white/30 text-xs">No holdings found</div>}
              </div>
            ) : (
              <div className="space-y-1">
                {fin.transactions?.map((t, i) => (
                  <div key={i} className="truncate text-xs flex justify-between">
                    <span>• {t.category}</span>
                    <span className={t.type === 'income' ? 'text-emerald-400' : 'text-[#ff4d7d]'}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount}
                    </span>
                  </div>
                )) || <div className="text-white/30 text-xs">No transactions found</div>}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (domain === 'health') {
      const hl = extractedData.healthData || {};
      return (
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-white/80">
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5 space-y-2">
            <div>
              <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Medications Prescribed</div>
              {hl.medications?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {hl.medications.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-white/90">{m}</span>
                  ))}
                </div>
              ) : <div className="text-white/30 text-xs">None listed</div>}
            </div>
            <div>
              <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Detected Deficiencies</div>
              {hl.deficiencies?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {hl.deficiencies.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-[#ff4d7d]/10 border border-[#ff4d7d]/20 text-xs text-[#ffb3ca]">{d}</span>
                  ))}
                </div>
              ) : <div className="text-white/30 text-xs text-emerald-400">No deficiencies detected</div>}
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Health Vitals</div>
            {hl.vitals ? (
              <div className="space-y-1 text-xs">
                {hl.vitals.systolic && <div>• Blood Pressure: <span className="font-semibold text-white">{hl.vitals.systolic}/{hl.vitals.diastolic} mmHg</span></div>}
                {hl.vitals.heartRate && <div>• Heart Rate: <span className="font-semibold text-white">{hl.vitals.heartRate} bpm</span></div>}
                {hl.vitals.bloodSugar && <div>• Blood Sugar: <span className="font-semibold text-white">{hl.vitals.bloodSugar} mg/dL</span></div>}
                {hl.vitals.weight && <div>• Weight: <span className="font-semibold text-white">{hl.vitals.weight} kg</span></div>}
              </div>
            ) : <div className="text-white/30 text-xs">No vitals extracted</div>}
          </div>
        </div>
      );
    }

    if (domain === 'career') {
      const car = extractedData.careerData || {};
      return (
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-white/80">
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5 space-y-1">
            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Academic / Learning Activity</div>
            <div>Study Hours: <span className="font-bold text-white">{car.studyHours || 0}h</span></div>
            <div>Completed Courses: <span className="font-bold text-[#7b61ff]">{car.completedCourses || 0}</span></div>
          </div>
          <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5 space-y-1">
            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Development Activity</div>
            <div>GitHub Commits: <span className="font-bold text-white">{car.githubCommits || 0}</span></div>
            <div>Projects Worked On: <span className="font-bold text-[#10c7a1]">{car.projectsCompleted || 0}</span></div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(123,97,255,0.08),transparent_35%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.08),transparent_30%)]" />
      
      <div className="relative mx-auto max-w-6xl space-y-6">
        <header className="rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7df3cc]/70">Digital Twin Sync</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Document AI Upload</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">Upload health statements, medical reports, bank statements, or career profiles to automatically extract metrics and update your dashboard.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
          {/* Left: Upload Target Box */}
          <div className="rounded-3xl border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] sm:p-6 h-fit shrink-0">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#10c7a1]" /> Upload File
            </h2>
            
            <form 
              onDragEnter={handleDrag} 
              onDragOver={handleDrag} 
              onDragLeave={handleDrag} 
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 px-6 text-center transition-all duration-300 cursor-pointer min-h-[250px]
                ${dragActive ? 'border-primary-500 bg-primary-500/5 shadow-[0_0_20px_rgba(123,97,255,0.3)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.01]'}`}
              onClick={onButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleChange}
                disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#10c7a1] border-t-transparent" />
                  <div>
                    <p className="text-sm font-semibold text-white/90">Analyzing Document…</p>
                    <p className="text-xs text-white/50 mt-1">Gemini AI is extracting structured metrics</p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className={`h-12 w-12 mb-4 transition-transform duration-300 ${dragActive ? 'scale-110 text-primary-400' : 'text-white/40'}`} />
                  <p className="text-sm font-bold text-white/80">Drag & drop files here, or click to browse</p>
                  <p className="text-xs text-white/45 mt-2 font-medium">Supports PDF, Excel (XLSX/XLS), CSV, Word (DOCX/DOC), and Images</p>
                  <div className="mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50">Max size 10MB</div>
                </>
              )}
            </form>
          </div>

          {/* Right: History Log */}
          <div className="rounded-3xl border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] sm:p-6">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#c8a84b]" /> Sync History
            </h2>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((upload) => {
                  const isExpanded = expandedId === upload._id;
                  const dateStr = new Date(upload.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={upload._id}
                      className="rounded-2xl border border-white/5 bg-black/40 overflow-hidden transition-all duration-300"
                    >
                      {/* Header Row */}
                      <div 
                        onClick={() => toggleExpand(upload._id)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/70 text-lg shrink-0">
                            {upload.domain === 'health' ? '🧬' : upload.domain === 'finance' ? '💎' : '🎯'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white/90 truncate">{upload.fileName}</div>
                            <div className="text-[11px] text-white/40 mt-0.5">{dateStr}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getDomainBadge(upload.domain)}`}>
                            {upload.domain}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                        </div>
                      </div>

                      {/* Expanded Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-white/5 bg-white/[0.01] p-4"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-black text-[#10c7a1] uppercase tracking-wider mb-3">
                              <Sparkles className="w-3.5 h-3.5" /> Extracted Digital Twin Signals
                            </div>
                            {renderExtractedData(upload)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-2xl bg-black/10">
                <FileText className="h-12 w-12 text-white/20 mb-3" />
                <p className="text-sm font-semibold text-white/60">No documents sync'd yet</p>
                <p className="text-xs text-white/45 mt-1 max-w-xs">Upload your bank statements, health tests or certificates to see them in history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentUpload;
