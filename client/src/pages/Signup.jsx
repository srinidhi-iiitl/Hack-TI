import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DigitalTwinLogo from '../components/DigitalTwinLogo';
import { loginSuccess } from '../features/auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const activeSignals = [
  { emoji: '🧬', label: 'Health', title: 'Shape your energy profile', copy: 'See the health layer pulse through a calm neon frame that feels alive.', accent: 'from-[#ff4d7d] via-[#7b61ff] to-[#10c7a1]' },
  { emoji: '💎', label: 'Finance', title: 'Build a sharper money rhythm', copy: 'Stay inside a premium finance layer with motion, clarity, and depth.', accent: 'from-[#0fbf87] via-[#1d5fff] to-[#c8a84b]' },
  { emoji: '🎯', label: 'Career', title: 'Move with sharper intent', copy: 'Turn opportunity into a visible, animated next step with style.', accent: 'from-[#7b61ff] via-[#0fbf87] to-[#1e2d7a]' },
];

const signalStats = [
  { label: 'Health', value: 84, bar: 92 },
  { label: 'Finance', value: 71, bar: 74 },
  { label: 'Career', value: 78, bar: 82 },
];

const orbitEmojis = ['🧬', '💎', '🎯'];

function RotatingSignal({ signal }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={signal.label} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 1.05 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${signal.accent} p-[1px] shadow-[0_24px_80px_-34px_rgba(0,0,0,0.75)]`}>
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[#080b12]/90 p-6 text-white backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,199,161,0.16),transparent_30%)]" />
          <div className="relative flex items-center gap-5">
            <motion.div animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/12 bg-white/10 text-3xl leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <span className="translate-y-[-2px]">{signal.emoji}</span>
            </motion.div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">{signal.label}</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">{signal.title}</h2>
              <p className="mt-1.5 max-w-md text-sm leading-6 text-white/72">{signal.copy}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState(signalStats.map(() => 0));
  const [barsReady, setBarsReady] = useState(false);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);

  useEffect(() => {
    let animationFrame;
    const animateCounters = (timestamp) => {
      const progress = Math.min((timestamp - performance.now()) / 2200, 1);
      setAnimatedStats(signalStats.map((stat) => Math.round(stat.value * (1 - Math.pow(1 - progress, 3)))));
      if (progress < 1) animationFrame = requestAnimationFrame(animateCounters);
    };
    animationFrame = requestAnimationFrame(animateCounters);
    const barTimer = setTimeout(() => setBarsReady(true), 420);
    const signalTimer = setInterval(() => setActiveSignalIndex((c) => (c + 1) % activeSignals.length), 3500);

    return () => { cancelAnimationFrame(animationFrame); clearTimeout(barTimer); clearInterval(signalTimer); };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, formData);
      toast.success('Account created!');
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      localStorage.removeItem('lifetwinOnboardingProfile');
      dispatch(loginSuccess({
        token: response.data.data.token,
        user: response.data.data.user,
        onboardingCompleted: false,
      }));
      navigate('/onboarding', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(9, 12, 20, 0.92)', color: '#f3f4f6', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.09)' } }} />
      
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-[10%] -left-[10%] h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(123,97,255,0.2),transparent_60%)] blur-[80px]" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 20, repeat: Infinity, delay: 2 }} className="absolute top-[40%] -right-[10%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(circle,rgba(16,199,161,0.2),transparent_60%)] blur-[80px]" />
      </div>

      <section className="relative isolate flex min-h-screen items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0e17]/60 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 backdrop-blur-2xl lg:grid-cols-[0.88fr_1.12fr]">
          
          <div className="relative flex overflow-hidden border-b border-white/10 bg-white/[0.02] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <motion.div aria-hidden="true" className="absolute inset-0" animate={{ rotate: [0, 1.2, 0, -1.2, 0] }} transition={{ duration: 16, repeat: Infinity }}>
              {orbitEmojis.map((emoji, index) => (
                <motion.div key={emoji} animate={{ x: [0, index % 2 === 0 ? 18 : -18, 0], y: [0, index === 1 ? -10 : 12, 0], rotate: [0, index % 2 === 0 ? 10 : -10, 0] }} transition={{ duration: 7 + index, repeat: Infinity }} className="absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[1.75rem] leading-none backdrop-blur-xl" style={{ left: `${18 + index * 18}%`, top: `${18 + index * 20}%` }}>
                  <span className="translate-y-[-2px]">{emoji}</span>
                </motion.div>
              ))}
            </motion.div>
            
            <div className="relative flex w-full flex-col justify-between gap-10">
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl hover:bg-white/10">
                  <DigitalTwinLogo className="h-8 w-8 rounded-full" /> DigitalTwin
                </Link>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:inline-flex">
                  Build your profile
                </div>
              </div>

              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  <span className="h-2 w-2 rounded-full bg-[#10c7a1] shadow-[0_0_18px_rgba(16,199,161,0.85)]" /> New account flow
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Start with a <span className="mt-2 block bg-gradient-to-r from-[#ffffff] via-[#9db7ff] to-[#7df3cc] bg-clip-text text-transparent">cinematic digital twin.</span>
                </h1>
                <p className="text-base leading-7 text-white/68 sm:text-lg">Create your profile and unlock a dark premium interface where health, finance, and career signals move in sync.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {signalStats.map((item, index) => (
                  <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{animatedStats[index]}%</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#7b61ff] via-[#10c7a1] to-[#7df3cc] transition-all duration-[2200ms]" style={{ width: barsReady ? `${item.bar}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center px-5 py-6 sm:px-8 lg:px-8 lg:py-10">
            <div className="relative w-full max-w-lg space-y-6">
              <RotatingSignal signal={activeSignals[activeSignalIndex]} />

              <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Create account</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Join DigitalTwin</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">✨</div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">First name</span>
                      <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7b61ff]/50 focus:bg-white/[0.08]" />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Last name</span>
                      <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#10c7a1]/50 focus:bg-white/[0.08]" />
                    </label>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Email</span>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm outline-none focus:border-[#7b61ff]/50 focus:bg-white/[0.08]" />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Password</span>
                      <input name="password" type="password" value={formData.password} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#10c7a1]/50 focus:bg-white/[0.08]" />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Confirm password</span>
                      <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#7b61ff]/50 focus:bg-white/[0.08]" />
                    </label>
                  </div>

                  <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="mt-2 w-full rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-4 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40">
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </motion.button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/38">or</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>

                <motion.button whileHover={{ y: -1, backgroundColor: "rgba(255,255,255,0.08)" }} type="button" className="flex w-full items-center justify-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/88 transition">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">G</span> Continue with Google
                </motion.button>

                <p className="mt-5 text-center text-sm text-white/62">Already have an account? <Link to="/login" className="font-semibold text-[#9db7ff] hover:text-[#7df3cc]">Log in</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;
