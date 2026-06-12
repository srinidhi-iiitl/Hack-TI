import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import DigitalTwinLogo from '../components/DigitalTwinLogo';
import { loginUser, loginWithGoogle } from '../features/auth/authThunks';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const activeSignals = [
  {
    emoji: '🧬',
    label: 'Health',
    title: 'Reset your rhythm',
    copy: 'Track strain, energy, and recovery without losing the premium feel.',
    accent: 'from-[#ff4d7d] via-[#7b61ff] to-[#10c7a1]',
  },
  {
    emoji: '💎',
    label: 'Finance',
    title: 'Stay on top of cash flow',
    copy: 'See your financial pulse in a calm, high-clarity dashboard layer.',
    accent: 'from-[#0fbf87] via-[#1d5fff] to-[#c8a84b]',
  },
  {
    emoji: '🎯',
    label: 'Career',
    title: 'Move with intent',
    copy: 'Focus on momentum, progress, and the next high-value move.',
    accent: 'from-[#7b61ff] via-[#0fbf87] to-[#1e2d7a]',
  },
];

const loginPulseBadges = ['Health', 'Finance', 'Career'];

const signalRanges = [
  { label: 'Health', min: 75, max: 95 },
  { label: 'Finance', min: 65, max: 90 },
  { label: 'Career', min: 70, max: 95 },
];

function createDemoSignalStats() {
  return signalRanges.map((signal) => ({
    ...signal,
    value: randomBetween(signal.min, signal.max),
  }));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function useAnimatedSignalStats() {
  const [stats] = useState(createDemoSignalStats);
  const [animatedStats, setAnimatedStats] = useState(signalRanges.map(() => 0));

  useEffect(() => {
    let animationFrame;
    let startTime;
    const duration = 1800;

    const animateCounters = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedStats(stats.map((stat) => Math.round(stat.value * eased)));
      if (progress < 1) animationFrame = requestAnimationFrame(animateCounters);
    };

    animationFrame = requestAnimationFrame(animateCounters);
    return () => cancelAnimationFrame(animationFrame);
  }, [stats]);

  return { stats, animatedStats };
}

function RotatingSignal({ signal }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={signal.label}
        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -20, scale: 1.05, filter: 'blur(10px)' }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${signal.accent} p-[1px] shadow-[0_24px_80px_-34px_rgba(0,0,0,0.75)]`}
      >
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[#080b12]/90 p-6 text-white backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,199,161,0.16),transparent_30%)]" />
          <div className="relative flex items-center gap-5">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/12 bg-white/10 text-3xl leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
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

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMode, setForgotMode] = useState('reset');
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', password: '', confirmPassword: '' });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [googleAccountDialogOpen, setGoogleAccountDialogOpen] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');
  const [passwordCreatedOpen, setPasswordCreatedOpen] = useState(false);
  const { stats: signalStats, animatedStats } = useAnimatedSignalStats();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSignalIndex((current) => (current + 1) % activeSignals.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const openForgotModal = (mode = 'reset', email = formData.email) => {
    setForgotForm({ email, otp: '', password: '', confirmPassword: '' });
    setForgotMode(mode);
    setForgotStep('email');
    setForgotMessage('');
    setPasswordCreatedOpen(false);
    setForgotOpen(true);
  };

  const openPasswordSetupModal = () => {
    setGoogleAccountDialogOpen(false);
    openForgotModal('create', googleAccountEmail || formData.email);
  };

  const closeForgotModal = () => {
    if (forgotLoading) return;
    setForgotOpen(false);
    setForgotMessage('');
  };

  const handleForgotChange = (e) => {
    setForgotForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const getForgotErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setForgotLoading(true);
    setForgotMessage('');

    try {
      const endpoint = forgotMode === 'create' ? 'send-password-otp' : 'forgot-password';
      const response = await axios.post(`${API_BASE_URL}/api/auth/${endpoint}`, {
        email: forgotForm.email,
      });
      setForgotStep('reset');
      setForgotMessage(response.data?.message || 'OTP sent to your registered email.');
      if (forgotMode !== 'create') {
        toast.success('OTP sent to your email.');
      }
    } catch (error) {
      const message = getForgotErrorMessage(error, "You don't have account with this mail");
      setForgotMessage(message);
      if (forgotMode !== 'create') {
        toast.error(message);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!forgotForm.otp.trim()) {
      if (forgotMode === 'create') setForgotMessage('OTP is required');
      else toast.error('OTP is required');
      return;
    }
    if (!forgotForm.password) {
      if (forgotMode === 'create') setForgotMessage('New Password is required');
      else toast.error('Password is required');
      return;
    }
    if (!forgotForm.confirmPassword) {
      if (forgotMode === 'create') setForgotMessage('Confirm Password is required');
      else toast.error('Confirm password is required');
      return;
    }
    if (forgotForm.password !== forgotForm.confirmPassword) {
      if (forgotMode === 'create') setForgotMessage('Passwords must match');
      else toast.error('Passwords do not match');
      return;
    }
    if (forgotForm.password.length < 6) {
      if (forgotMode === 'create') setForgotMessage('Password must be at least 6 characters');
      else toast.error('Password must be at least 6 characters');
      return;
    }

    setForgotLoading(true);
    setForgotMessage('');

    try {
      let response;

      if (forgotMode === 'create') {
        response = await axios.post(`${API_BASE_URL}/api/auth/create-password`, {
          email: forgotForm.email,
          otp: forgotForm.otp,
          newPassword: forgotForm.password,
          confirmPassword: forgotForm.confirmPassword,
        });
      } else {
        response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
          email: forgotForm.email,
          otp: forgotForm.otp,
          password: forgotForm.password,
          confirmPassword: forgotForm.confirmPassword,
        });
      }
      if (forgotMode !== 'create') {
        toast.success(response.data?.message || 'Password reset successfully.');
      }
      setFormData((current) => ({ ...current, email: forgotForm.email, password: '' }));
      setForgotOpen(false);
      if (forgotMode === 'create') {
        setPasswordCreatedOpen(true);
        navigate('/login', { replace: true });
      }
    } catch (error) {
      const message = getForgotErrorMessage(error, 'Invalid or expired OTP');
      setForgotMessage(message);
      if (forgotMode !== 'create') {
        toast.error(message);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    try {
      await dispatch(loginUser(formData)).unwrap();
      toast.success('Login successful!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const code = typeof error === 'object' ? error?.code : undefined;
      const message = typeof error === 'string' ? error : error?.message || 'Login failed.';
      if (code === 'GOOGLE_ACCOUNT' || message.toLowerCase().includes('created with google')) {
        setGoogleAccountEmail(error?.email || formData.email);
        setGoogleAccountDialogOpen(true);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      setGoogleAccountDialogOpen(false);
      await dispatch(loginWithGoogle()).unwrap();
      toast.success('Google sign-in successful!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Unable to continue with Google.');
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
        <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0e17]/60 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr]">
          
          <div className="relative flex overflow-hidden border-b border-white/10 bg-white/[0.02] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <div className="relative flex w-full flex-col justify-between gap-10">
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl hover:bg-white/10">
                  <DigitalTwinLogo className="h-8 w-8 rounded-full" /> DigitalTwin
                </Link>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10c7a1]" /> Live in motion
                </div>
              </div>

              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  <span className="h-2 w-2 rounded-full bg-[#10c7a1] shadow-[0_0_18px_rgba(16,199,161,0.85)]" /> Health · Finance · Career
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Welcome
                  <span className="mt-2 block bg-gradient-to-r from-[#ffffff] via-[#9db7ff] to-[#7df3cc] bg-clip-text text-transparent">back.</span>
                </h1>
                <p className="text-base leading-7 text-white/68 sm:text-lg">Continue your journey with personalized insights, goal tracking, and progress across health, finance, and career.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {loginPulseBadges.map((badge, i) => (
                  <motion.span key={badge} animate={{ y: [0, i % 2 === 0 ? -4 : 4, 0] }} transition={{ duration: 3.2 + i * 0.4, repeat: Infinity }} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">{badge}</motion.span>
                ))}
              </div>

              <SignalStatCards stats={signalStats} animatedStats={animatedStats} />
            </div>
          </div>

          <div className="relative flex items-center justify-center px-5 py-6 sm:px-8 lg:px-8 lg:py-10">
            <div className="relative w-full max-w-lg space-y-6">
              <RotatingSignal signal={activeSignals[activeSignalIndex]} />

              <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Secure access</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Sign in</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">✨</div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Email address</span>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08]" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Password</span>
                    <input name="password" type="password" value={formData.password} onChange={handleChange} disabled={isLoading} className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#10c7a1]/50 focus:bg-white/[0.08]" />
                  </label>
                  
                  <div className="flex items-center justify-between pt-2 text-sm text-white/65">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white transition"><input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#7b61ff]" /> Remember me</label>
                    <button type="button" onClick={() => openForgotModal('reset')} className="font-medium text-[#8fd9ff] transition hover:text-[#b7f7d4]">Forgot password?</button>
                  </div>

                  <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="mt-2 w-full rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-4 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40">
                    {isLoading ? 'Authenticating...' : 'Enter digital twin'}
                  </motion.button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/38">or</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>

                <motion.button whileHover={{ y: -1, backgroundColor: "rgba(255,255,255,0.08)" }} type="button" onClick={handleGoogleLogin} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/88 transition disabled:opacity-60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">G</span> Continue with Google
                </motion.button>

                <p className="mt-6 text-center text-sm text-white/62">New to DigitalTwin? <Link to="/signup" className="font-semibold text-[#9db7ff] hover:text-[#7df3cc]">Create an account</Link></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {googleAccountDialogOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="google-account-title"
              className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0a0e17] p-5 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.92)] ring-1 ring-white/5 sm:p-6"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7df3cc]/75">Sign-in method</p>
                  <h2 id="google-account-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">Google Account Detected</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">This account was originally created using Google Sign-In.</p>
                  <p className="mt-2 text-sm leading-6 text-white/60">You can either continue using Google or create a password for email/password login.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleAccountDialogOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close Google account dialog"
                >
                  X
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setGoogleAccountDialogOpen(false)}
                  className="w-full rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40 disabled:opacity-60"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={openPasswordSetupModal}
                  className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
                >
                  Generate Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-password-title"
              className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0a0e17] p-5 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.92)] ring-1 ring-white/5 sm:p-6"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7df3cc]/75">Account recovery</p>
                  <h2 id="forgot-password-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {forgotMode === 'create' ? (forgotStep === 'email' ? 'Create password' : 'Enter OTP') : (forgotStep === 'email' ? 'Reset password' : 'Enter OTP')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {forgotStep === 'email'
                      ? (forgotMode === 'create' ? `A verification code will be sent to: ${forgotForm.email}` : 'Enter your registered email to receive a password reset OTP.')
                      : 'Enter the OTP sent to your email and create a new password.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  disabled={forgotLoading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  aria-label="Close password reset popup"
                >
                  X
                </button>
              </div>

              {forgotStep === 'email' ? (
                <form className="space-y-4" onSubmit={handleForgotEmailSubmit}>
                  {forgotMode === 'create' ? (
                    <p className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">{forgotForm.email}</p>
                  ) : (
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">Registered email</span>
                      <input
                        name="email"
                        type="email"
                        required
                        value={forgotForm.email}
                        onChange={handleForgotChange}
                        disabled={forgotLoading}
                        className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08] disabled:opacity-60"
                      />
                    </label>
                  )}

                  {forgotMessage && <p className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">{forgotMessage}</p>}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeForgotModal} disabled={forgotLoading} className="flex-1 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={forgotLoading} className="flex-1 rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40 disabled:opacity-60">
                      {forgotLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleResetPasswordSubmit}>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">OTP</span>
                    <input
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={forgotForm.otp}
                      onChange={handleForgotChange}
                      disabled={forgotLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#7df3cc]/50 focus:bg-white/[0.08] disabled:opacity-60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">New password</span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      value={forgotForm.password}
                      onChange={handleForgotChange}
                      disabled={forgotLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08] disabled:opacity-60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">Confirm password</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      value={forgotForm.confirmPassword}
                      onChange={handleForgotChange}
                      disabled={forgotLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#10c7a1]/50 focus:bg-white/[0.08] disabled:opacity-60"
                    />
                  </label>

                  {forgotMessage && <p className="rounded-[1rem] border border-[#10c7a1]/20 bg-[#10c7a1]/10 px-4 py-3 text-sm text-white/78">{forgotMessage}</p>}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={closeForgotModal} disabled={forgotLoading} className="flex-1 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={forgotLoading} className="flex-1 rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40 disabled:opacity-60">
                      {forgotLoading ? 'Updating...' : (forgotMode === 'create' ? 'Create password' : 'Update password')}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passwordCreatedOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/62 px-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-created-title"
              className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#0a0e17] p-5 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.92)] ring-1 ring-white/5 sm:p-6"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#7df3cc]/75">Password ready</p>
              <h2 id="password-created-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">Password created successfully.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">You can now log in using either:</p>
              <div className="mt-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/75">
                <p>Google Sign-In</p>
                <p>Email and Password</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordCreatedOpen(false)}
                className="mt-5 w-full rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-white/40"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SignalStatCards({ stats, animatedStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: [0, -4, 0] }}
          transition={{
            opacity: { duration: 0.55, delay: index * 0.1 },
            y: { duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_16px_50px_-35px_rgba(16,199,161,0.7)] backdrop-blur-md"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{animatedStats[index]}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7b61ff] via-[#10c7a1] to-[#7df3cc] shadow-[0_0_18px_rgba(16,199,161,0.65)]"
              style={{ width: `${animatedStats[index]}%` }}
              animate={{ boxShadow: ['0 0 6px rgba(16,199,161,0.35)', '0 0 18px rgba(16,199,161,0.75)', '0 0 10px rgba(16,199,161,0.45)'] }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default Login;
