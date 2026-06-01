import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import BackgroundBeams from '../components/BackgroundBeams';
import DigitalTwinLogo from '../components/DigitalTwinLogo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const behaviorSignals = [
  { id: 'health', title: 'Health rhythm', description: 'Sleep, recovery, energy, and daily consistency.' },
  { id: 'career', title: 'Career momentum', description: 'Learning, practice, output, and work patterns.' },
  { id: 'finance', title: 'Financial patterns', description: 'Income, expenses, savings, and money stress.' },
  { id: 'productivity', title: 'Productivity flow', description: 'Planning, focus blocks, context switching, and follow-through.' },
  { id: 'mentalWellness', title: 'Mental wellness', description: 'Stress, calm, mood balance, and mental load.' },
  { id: 'fitness', title: 'Fitness habits', description: 'Movement frequency, activity quality, and consistency.' },
];

const integrationProfiles = [
  {
    id: 'github',
    title: 'GitHub',
    field: 'username',
    label: 'GitHub username or profile link',
    placeholder: 'Anjali-k10 or https://github.com/Anjali-k10',
    description: 'Code activity and project consistency.',
    logo: GitHubLogo,
  },
  {
    id: 'leetcode',
    title: 'LeetCode',
    field: 'username',
    label: 'LeetCode username or profile link',
    placeholder: 'anjalik_10 or https://leetcode.com/u/anjalik_10/',
    description: 'Practice cadence and problem-solving signals.',
    logo: LeetCodeLogo,
  },
  {
    id: 'fitbit',
    title: 'Fitbit',
    field: 'profileLink',
    label: 'Fitbit profile link',
    placeholder: 'https://fitbit.com/user/...',
    description: 'Sleep, recovery, steps, and activity trends.',
    logo: FitbitLogo,
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    field: 'profileLink',
    label: 'LinkedIn profile link',
    placeholder: 'https://linkedin.com/in/your-profile',
    description: 'Career signal, profile strength, and professional momentum.',
    logo: LinkedInLogo,
  },
  {
    id: 'banking',
    title: 'Banking App',
    field: 'profileLink',
    label: 'Banking profile link',
    placeholder: 'https://bank.example/profile',
    description: 'Spending rhythm, savings behavior, and cashflow.',
    logo: BankingLogo,
  },
];

const analysisMessages = [
  'Analyzing behavior patterns...',
  'Mapping integration signals...',
  'Running OCR on baseline documents...',
  'Reading financial rhythm...',
  'Building lifestyle baseline...',
  'Personalizing your dashboard...',
];

const initialOnboardingData = {
  behavioralAnalysis: {
    focusAreas: [],
  },
  integrations: {
    github: { status: 'skipped', username: '' },
    leetcode: { status: 'skipped', username: '' },
    fitbit: { status: 'skipped', profileLink: '' },
    linkedin: { status: 'skipped', profileLink: '' },
    banking: { status: 'skipped', profileLink: '' },
  },
  // ✅ NEW: Document Vault for Vision AI (File Uploads)
  dataVault: {
    medicalReport: null,
    resume: null,
    bankStatement: null,
  },
  lifestyle: {
    gender: '',
    sleepHours: 7,
    studyHours: 4,
    exerciseFrequency: 3,
    spendingStyle: 'balanced',
    smokingHabits: 'no',
    periodTracking: 'not_now',
    genderSpecificHealthContext: 'not_now',
  },
  financialPatterns: {
    monthlyIncome: '',
    monthlyExpenditure: '',
    savingsHabits: 'moderate',
    financialStressLevel: 4,
  },
};

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [navigationDirection, setNavigationDirection] = useState(1);
  const [onboardingData, setOnboardingData] = useState(initialOnboardingData);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const totalSteps = 7; // ✅ Updated to 7 steps
  const progress = useMemo(() => (step / totalSteps) * 100, [step]);
  const isAnalysisDone = analysisProgress >= 100;

  useEffect(() => {
    if (step !== 7 || isAnalysisDone) {
      return undefined;
    }

    const progressTimer = window.setInterval(() => {
      setAnalysisProgress((current) => Math.min(current + 4, 100));
    }, 170);

    const messageTimer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % analysisMessages.length);
    }, 850);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(messageTimer);
    };
  }, [isAnalysisDone, step]);

  const showIncompleteToast = (message) => {
    toast.error(message, {
      style: {
        borderRadius: '8px',
        background: '#111827',
        color: '#fff',
      },
    });
  };

  const toggleFocusArea = (areaId) => {
    setOnboardingData((current) => {
      const selected = current.behavioralAnalysis.focusAreas.includes(areaId);

      return {
        ...current,
        behavioralAnalysis: {
          ...current.behavioralAnalysis,
          focusAreas: selected
            ? current.behavioralAnalysis.focusAreas.filter((item) => item !== areaId)
            : [...current.behavioralAnalysis.focusAreas, areaId],
        },
      };
    });
  };

  const setIntegrationStatus = (integrationId, status, verifiedData = null) => {
    setOnboardingData((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [integrationId]: {
          ...current.integrations[integrationId],
          status,
          verifiedData,
        },
      },
    }));
  };

  const updateIntegrationField = (integrationId, field, value) => {
    setOnboardingData((current) => ({
      ...current,
      integrations: {
        ...current.integrations,
        [integrationId]: {
          ...current.integrations[integrationId],
          [field]: value,
        },
      },
    }));
  };

  // ✅ NEW: Handle File Uploads for the Data Vault
  // ✅ UPGRADED: Real API Integration for Vision AI File Uploads
  const handleFileUpload = async (documentType, file) => {
    if (!file) return;
    
    // 1. Instantly update UI to show it's "Uploading/Parsing"
    setOnboardingData((current) => ({
      ...current,
      dataVault: {
        ...current.dataVault,
        [documentType]: "Processing AI OCR...",
      },
    }));

    const toastId = toast.loading(`Uploading ${file.name} to Vision AI...`);

    try {
      const token = localStorage.getItem('authToken');
      
      // 2. Prepare the FormData for Multer
      const formData = new FormData();
      formData.append('image', file);
      
      // Map the onboarding document type to the backend context types
      let contextMap = 'medical';
      if (documentType === 'bankStatement') contextMap = 'finance';
      if (documentType === 'resume') contextMap = 'career'; // Assuming you add this to your VisionAIService
      
      formData.append('contextType', contextMap);

      // 3. Send to your actual backend AI route
      const response = await axios.post(`${API_BASE_URL}/api/ai/analyze`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // 4. Update UI with success and save the extracted JSON data to the vault
        setOnboardingData((current) => ({
          ...current,
          dataVault: {
            ...current.dataVault,
            [documentType]: file.name,
            [`${documentType}_extracted`]: response.data.data // Save the AI's parsed JSON!
          },
        }));
        
        toast.success(`${file.name} successfully parsed by DigitalTwin AI.`, { id: toastId });
      }

    } catch (error) {
      console.error("Vision AI Upload Error:", error);
      toast.error(`Failed to parse ${file.name}. Please try again.`, { id: toastId });
      
      // Reset the file name on failure
      setOnboardingData((current) => ({
        ...current,
        dataVault: { ...current.dataVault, [documentType]: null },
      }));
    }
  };

  const handleConnectIntegration = async (integration) => {
    const value = onboardingData.integrations[integration.id][integration.field]?.trim();

    if (!value) {
      showIncompleteToast(`Add your ${integration.label.toLowerCase()} before connecting.`);
      return;
    }

    const token = localStorage.getItem('authToken');

    if (!token) {
      toast.error('Please log in again before connecting integrations.');
      navigate('/login', { replace: true });
      return;
    }

    setIntegrationStatus(integration.id, 'verifying');

    try {
      const verifiedData = await verifyIntegrationProfile(integration, value, token);

      if (!verifiedData.connected) {
        throw new Error(verifiedData.error || `${integration.title} profile was not found.`);
      }

      if (integration.id === 'linkedin') {
        setIntegrationStatus(integration.id, 'saved', verifiedData);
        toast.success('LinkedIn profile link saved as an unverified career signal.');
        return;
      }

      setIntegrationStatus(integration.id, 'connected', verifiedData);
      toast.success(`${integration.title} verified and connected.`);
    } catch (error) {
      setIntegrationStatus(integration.id, 'skipped');
      toast.error(error.response?.data?.message || error.message || `${integration.title} connection failed.`);
    }
  };

  const handleSkipAllIntegrations = () => {
    setOnboardingData((current) => {
      const integrations = { ...current.integrations };
      integrationProfiles.forEach((integration) => {
        integrations[integration.id] = { ...integrations[integration.id], status: 'skipped' };
      });
      return { ...current, integrations };
    });

    toast.success('Integrations skipped for now.');
    setNavigationDirection(1);
    setStep(4);
  };

  const verifyIntegrationProfile = async (integration, value, token) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (integration.id === 'github') {
      const response = await axios.get(`${API_BASE_URL}/api/integrations/github/${encodeURIComponent(value)}`, { headers });
      return response.data.data;
    }
    if (integration.id === 'leetcode') {
      const response = await axios.get(`${API_BASE_URL}/api/integrations/leetcode/${encodeURIComponent(value)}`, { headers });
      return response.data.data;
    }
    if (integration.id === 'linkedin') {
      const response = await axios.post(`${API_BASE_URL}/api/integrations/linkedin`, { linkedinProfile: value }, { headers });
      return response.data.data;
    }
    return { connected: true, source: integration.id, profileLink: value };
  };

  const updateLifestyle = (field, value) => {
    setOnboardingData((current) => ({
      ...current,
      lifestyle: {
        ...current.lifestyle,
        [field]: value,
        ...(field === 'gender' && value === 'male' ? { periodTracking: 'not_applicable' } : {}),
        ...(field === 'gender' && value === 'female' ? { genderSpecificHealthContext: 'not_now' } : {}),
      },
    }));
  };

  const updateFinancialPattern = (field, value) => {
    setOnboardingData((current) => ({
      ...current,
      financialPatterns: {
        ...current.financialPatterns,
        [field]: value,
      },
    }));
  };

  const validateCurrentStep = () => {
    if (step === 1 && !onboardingData.lifestyle.gender) {
      showIncompleteToast('Select your gender to personalize health thresholds.');
      return false;
    }
    if (step === 2 && onboardingData.behavioralAnalysis.focusAreas.length === 0) {
      showIncompleteToast('Choose at least one behavioral signal for your Digital Twin.');
      return false;
    }
    if (step === 3) {
      const missingProfile = integrationProfiles.find((integration) => {
        const data = onboardingData.integrations[integration.id];
        return data.status === 'connected' && !data[integration.field]?.trim();
      });
      if (missingProfile) {
        showIncompleteToast(`Add your ${missingProfile.label.toLowerCase()} or skip it for now.`);
        return false;
      }
    }
    // Step 4 is Data Vault (File Uploads) - keeping this entirely optional so users aren't forced.
    if (step === 6) {
      const { monthlyIncome, monthlyExpenditure } = onboardingData.financialPatterns;
      if (!monthlyIncome || !monthlyExpenditure) {
        showIncompleteToast('Add monthly income and expenditure to build financial patterns.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setNavigationDirection(1);
    setStep((current) => Math.min(current + 1, totalSteps));
  };

  const handleBack = () => {
    setNavigationDirection(-1);
    setStep((current) => Math.max(current - 1, 1));
  };

  const handlePersonalizeDashboard = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please log in again to save onboarding.');
      navigate('/login', { replace: true });
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/onboarding`, onboardingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem('lifetwinOnboardingProfile', JSON.stringify(onboardingData));
      localStorage.setItem('digitalTwinDashboardData', JSON.stringify(response.data.data));
      toast.success('Dashboard personalized');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Onboarding save error:', error);
      localStorage.removeItem('lifetwinOnboardingProfile');
      toast.error(error.response?.data?.message || 'Unable to save onboarding. Please try again.');
    }
  };

  const renderGenderSelection = () => (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
      <DigitalTwinLogo className="mb-8 h-14 w-14 rounded-lg border border-[#d8e5ea] shadow-lg shadow-[#b8d1da]/60" />
      <p className="mb-3 text-sm font-semibold text-[#416f82]">DigitalTwin profile setup</p>
      <h1 className="max-w-xl text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
        Select your gender
      </h1>
      <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600">
        This helps DigitalTwin personalize health questions, recovery baselines, and threshold calculations.
      </p>

      <div className="mt-9 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {
            value: 'female',
            label: 'Female',
            detail: 'Includes period-aware health context.',
            selectedClass: 'border-[#d98ba1] bg-[#fff2f5] ring-4 ring-[#f8d9e2]',
            idleClass: 'border-[#efd4dc] bg-white hover:border-[#e7aabc] hover:bg-[#fff7f9]',
          },
          {
            value: 'male',
            label: 'Male',
            detail: 'Uses male recovery and fitness baselines.',
            selectedClass: 'border-[#4f85b5] bg-[#eaf4ff] ring-4 ring-[#cfe6fb]',
            idleClass: 'border-[#d8e5ea] bg-white hover:border-[#6fa5d0] hover:bg-[#eef7ff]',
          },
        ].map((option) => {
          const selected = onboardingData.lifestyle.gender === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateLifestyle('gender', option.value)}
              className={`min-h-32 rounded-lg border p-5 text-left shadow-sm transition-colors duration-200 ${
                selected ? option.selectedClass : option.idleClass
              }`}
            >
              <span className="block text-lg font-semibold text-zinc-950">{option.label}</span>
              <span className="mt-3 block text-sm leading-6 text-zinc-600">{option.detail}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="mt-9 rounded-lg bg-[#416f82] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#b8d1da]/60 transition hover:-translate-y-0.5 hover:bg-[#2f5362] focus:outline-none focus:ring-4 focus:ring-[#e5f0f4]"
      >
        Next
      </button>
    </div>
  );

  const renderBehavioralAnalysis = () => (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#416f82]">Behavioral analysis</p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Choose the signals to model</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          Select the life domains your Digital Twin should use to understand your baseline behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {behaviorSignals.map((signal) => {
          const selected = onboardingData.behavioralAnalysis.focusAreas.includes(signal.id);
          return (
            <button
              key={signal.id}
              type="button"
              onClick={() => toggleFocusArea(signal.id)}
              className={`min-h-36 rounded-lg border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                selected
                  ? 'border-[#5f8fa0] bg-[#eef6f8] ring-4 ring-[#e5f0f4]'
                  : 'border-[#d8e5ea] hover:border-[#a9c8d2] hover:bg-[#f6fafb]'
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-base font-semibold text-zinc-950">{signal.title}</span>
                <span
                  className={`h-5 w-5 rounded-full border ${
                    selected ? 'border-[#416f82] bg-[#416f82]' : 'border-[#b7cbd3] bg-white'
                  }`}
                />
              </div>
              <p className="text-sm leading-6 text-zinc-600">{signal.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderIntegrations = () => (
    <section>
      <div className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#416f82]">Continuous Tracking</p>
          <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Connect Live APIs</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            DigitalTwin uses these live integrations to autonomously update your dashboard without manual logging.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSkipAllIntegrations}
          className="w-fit rounded-lg border border-[#c8dbe2] bg-white px-4 py-2 text-sm font-semibold text-[#405965] transition hover:border-[#9ebfca] hover:bg-[#f3f8fa]"
        >
          Skip all
        </button>
      </div>

      <div className="rounded-lg border border-[#d8e5ea] bg-white/80 p-3 shadow-sm sm:p-4">
        <div className="space-y-2">
        {integrationProfiles.map((integration) => {
          const data = onboardingData.integrations[integration.id];
          const connected = data.status === 'connected';
          const saved = data.status === 'saved';
          const verifying = data.status === 'verifying';
          const hasValue = Boolean(data[integration.field]?.trim());

          return (
            <div
              key={integration.id}
              className={`grid grid-cols-1 items-center gap-3 rounded-lg border px-3 py-2 transition-colors md:grid-cols-[240px_minmax(0,1fr)_120px] ${
                connected || saved
                  ? 'border-[#b8d8c5] bg-[#f4fbf6]'
                  : 'border-transparent bg-white hover:border-[#d8e5ea] hover:bg-[#f7fbfc]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e6f1f4] text-[#416f82]">
                  <integration.logo />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-zinc-950">{integration.title}</h3>
                    <ChevronRightIcon />
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{integration.description}</p>
                </div>
              </div>

              {integration.field && (
                <label className="block min-w-0">
                  <span className="sr-only">{integration.label}</span>
                  <input
                    type="text"
                    value={data[integration.field]}
                    disabled={verifying}
                    onChange={(event) => updateIntegrationField(integration.id, integration.field, event.target.value)}
                    placeholder={integration.placeholder}
                    className="h-10 w-full rounded-lg border border-[#c8dbe2] bg-[#f8fafb] px-4 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#5f8fa0] focus:bg-white focus:ring-4 focus:ring-[#e5f0f4]"
                  />
                </label>
              )}

              <div className="flex items-center justify-start gap-3 md:justify-end">
                {connected || saved ? (
                  <>
                    <span className="inline-flex h-9 w-9 items-center justify-center text-[#22c55e]" aria-label={connected ? 'Connected' : 'Saved'}>
                      <VerifiedIcon />
                    </span>
                    <button
                      type="button"
                      onClick={() => setIntegrationStatus(integration.id, 'skipped')}
                      disabled={verifying}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#c8dbe2] bg-white text-[#4b7bec] transition hover:border-[#9ebfca] hover:bg-[#f3f8fa] disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Remove ${integration.title}`}
                    >
                      <TrashIcon />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectIntegration(integration)}
                    disabled={verifying || !hasValue}
                    className={`h-9 min-w-24 rounded-lg border px-4 text-sm font-semibold transition ${
                      verifying
                        ? 'cursor-not-allowed border-[#9ebfca] bg-[#9ebfca] text-white'
                        : hasValue
                          ? 'border-[#c8dbe2] bg-white text-zinc-950 hover:border-[#9ebfca] hover:bg-[#f3f8fa]'
                          : 'cursor-not-allowed border-[#d8e5ea] bg-[#f7fbfc] text-zinc-400'
                    }`}
                  >
                    {verifying ? 'Checking...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );

  // ✅ NEW STEP 4: Document Vault for Vision AI 
  const renderDataVault = () => (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#416f82]">Baseline initialization</p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Upload Baseline Documents</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          Upload existing files. Our Vision AI will automatically parse your medical history, financial statements, and career resume to jumpstart your Digital Twin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <UploadCard 
          id="medicalReport"
          title="Medical Report" 
          description="Lab results or doctor prescriptions." 
          icon={<HeartPulseIcon />}
          uploadedFile={onboardingData.dataVault.medicalReport}
          onUpload={(file) => handleFileUpload('medicalReport', file)}
        />
        <UploadCard 
          id="resume"
          title="Resume & Certs" 
          description="PDFs of your CV or course certificates." 
          icon={<BriefcaseIcon />}
          uploadedFile={onboardingData.dataVault.resume}
          onUpload={(file) => handleFileUpload('resume', file)}
        />
        <UploadCard 
          id="bankStatement"
          title="Bank Statement" 
          description="Recent PDF exports of your bank ledger." 
          icon={<BankNoteIcon />}
          uploadedFile={onboardingData.dataVault.bankStatement}
          onUpload={(file) => handleFileUpload('bankStatement', file)}
        />
      </div>
    </section>
  );

  const renderLifestyle = () => (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#416f82]">Lifestyle understanding</p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Add everyday context</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          These manual inputs act as a fallback baseline when live APIs or document uploads are unavailable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RangeCard label="Sleep hours" value={onboardingData.lifestyle.sleepHours} min={3} max={12} suffix="hrs" onChange={(value) => updateLifestyle('sleepHours', value)} />
        <RangeCard label="Study hours" value={onboardingData.lifestyle.studyHours} min={0} max={12} suffix="hrs" onChange={(value) => updateLifestyle('studyHours', value)} />
        <RangeCard label="Exercise frequency" value={onboardingData.lifestyle.exerciseFrequency} min={0} max={7} suffix="days/week" onChange={(value) => updateLifestyle('exerciseFrequency', value)} />
        <SelectCard
          label="Spending style"
          value={onboardingData.lifestyle.spendingStyle}
          options={[
            { value: 'careful', label: 'Careful' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'variable', label: 'Variable' },
            { value: 'high', label: 'High spending' },
          ]}
          onChange={(value) => updateLifestyle('spendingStyle', value)}
        />
        <ChoiceCard
          label="Smoking habits"
          value={onboardingData.lifestyle.smokingHabits}
          options={[
            { value: 'no', label: 'No' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'yes', label: 'Yes' },
          ]}
          onChange={(value) => updateLifestyle('smokingHabits', value)}
        />
        {onboardingData.lifestyle.gender === 'female' ? (
          <ChoiceCard
            label="Period tracking preference"
            value={onboardingData.lifestyle.periodTracking}
            options={[
              { value: 'enabled', label: 'Track' },
              { value: 'not_now', label: 'Not now' },
              { value: 'irregular', label: 'Irregular' },
            ]}
            onChange={(value) => updateLifestyle('periodTracking', value)}
          />
        ) : (
          <ChoiceCard
            label="Training recovery focus"
            value={onboardingData.lifestyle.genderSpecificHealthContext}
            options={[
              { value: 'strength', label: 'Strength' },
              { value: 'cardio', label: 'Cardio' },
              { value: 'not_now', label: 'Not now' },
            ]}
            onChange={(value) => updateLifestyle('genderSpecificHealthContext', value)}
          />
        )}
      </div>
    </section>
  );

  const renderFinancialPatterns = () => (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#416f82]">Financial patterns</p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Map money behavior</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          DigitalTwin uses these signals to understand spending pressure, savings rhythm, and financial stress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InputCard label="Monthly income" value={onboardingData.financialPatterns.monthlyIncome} placeholder="50000" onChange={(value) => updateFinancialPattern('monthlyIncome', value)} />
        <InputCard label="Monthly expenditure" value={onboardingData.financialPatterns.monthlyExpenditure} placeholder="32000" onChange={(value) => updateFinancialPattern('monthlyExpenditure', value)} />
        <SelectCard
          label="Savings habits"
          value={onboardingData.financialPatterns.savingsHabits}
          options={[
            { value: 'low', label: 'Save rarely' },
            { value: 'moderate', label: 'Save sometimes' },
            { value: 'consistent', label: 'Save consistently' },
            { value: 'aggressive', label: 'Save aggressively' },
          ]}
          onChange={(value) => updateFinancialPattern('savingsHabits', value)}
        />
        <RangeCard label="Financial stress level" value={onboardingData.financialPatterns.financialStressLevel} min={1} max={10} suffix="/10" onChange={(value) => updateFinancialPattern('financialStressLevel', value)} />
      </div>
    </section>
  );

  const renderAnalysis = () => (
    <section className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
      <div className="relative mb-8 h-28 w-28">
        <div className="absolute inset-0 rounded-full border border-zinc-200" />
        <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-[#5f8fa0]" />
        <div className="absolute inset-5 flex items-center justify-center rounded-full bg-[#416f82] text-sm font-semibold text-white">
          {analysisProgress}%
        </div>
      </div>

      <p className="text-sm font-semibold text-[#416f82]">
        {isAnalysisDone ? 'Analysis complete' : analysisMessages[messageIndex]}
      </p>
      <h2 className="mt-3 text-4xl font-semibold text-zinc-950">
        {isAnalysisDone ? 'Your DigitalTwin Profile is Ready' : 'Building your Digital Twin profile'}
      </h2>
      <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-600">
        {isAnalysisDone
          ? 'Dashboard personalization is ready to begin from your profile baseline.'
          : 'DigitalTwin is combining behavioral, integration, OCR document data, and financial patterns into a dashboard-ready profile.'}
      </p>

      <div className="mt-8 h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[#5f8fa0] transition-all duration-300"
          style={{ width: `${analysisProgress}%` }}
        />
      </div>

      {isAnalysisDone && (
        <button
          type="button"
          onClick={handlePersonalizeDashboard}
          className="mt-9 rounded-lg bg-[#416f82] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#b8d1da]/60 transition hover:-translate-y-0.5 hover:bg-[#2f5362] focus:outline-none focus:ring-4 focus:ring-[#e5f0f4]"
        >
          Personalize Dashboard
        </button>
      )}
    </section>
  );

  const renderCurrentStep = () => {
    if (step === 1) return renderGenderSelection();
    if (step === 2) return renderBehavioralAnalysis();
    if (step === 3) return renderIntegrations();
    if (step === 4) return renderDataVault(); // ✅ NEW STEP MAPPED HERE
    if (step === 5) return renderLifestyle();
    if (step === 6) return renderFinancialPatterns();
    return renderAnalysis();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#223946] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <BackgroundBeams className="opacity-90" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col rounded-lg border border-white/20 bg-white/[0.82] shadow-xl shadow-black/25 backdrop-blur-md">
        <header className="border-b border-white/25 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <DigitalTwinLogo className="h-10 w-10 rounded-lg border border-[#d8e5ea] shadow-sm" />
              <div>
                <p className="text-sm font-semibold text-zinc-950">DigitalTwin</p>
              </div>
            </div>

            <div className="w-full lg:max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>Step {step} of {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[#5f8fa0] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
          <AnimatePresence mode="wait" initial={false} custom={navigationDirection}>
            <motion.div
              key={step}
              custom={navigationDirection}
              initial={{ opacity: 0, x: navigationDirection > 0 ? 34 : -34, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: navigationDirection > 0 ? -18 : 18, filter: 'blur(4px)' }}
              transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: 'opacity, transform, filter' }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {step > 1 && step < 7 && (
          <footer className="flex flex-col gap-3 border-t border-white/25 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-[#c8dbe2] bg-white px-5 py-3 text-sm font-semibold text-[#405965] transition hover:bg-[#f3f8fa]"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-[#416f82] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#b8d1da]/60 transition hover:-translate-y-0.5 hover:bg-[#2f5362] focus:outline-none focus:ring-4 focus:ring-[#e5f0f4]"
            >
              {step === 6 ? 'Run Profile Analysis' : 'Next'}
            </button>
          </footer>
        )}
      </div>
    </main>
  );
}

// --- SUB COMPONENTS ---

// ✅ NEW: Upload Card Component for the Data Vault
function UploadCard({ id, title, description, icon, uploadedFile, onUpload }) {
  return (
    <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${uploadedFile ? 'border-[#b8d8c5] bg-[#f4fbf6]' : 'border-[#c8dbe2] bg-white hover:border-[#5f8fa0] hover:bg-[#f7fbfc]'}`}>
      <input type="file" id={id} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(e) => onUpload(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" />
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${uploadedFile ? 'bg-[#e6f4ea] text-[#22c55e]' : 'bg-[#e5f0f4] text-[#416f82]'}`}>
        {uploadedFile ? <VerifiedIcon className="h-6 w-6" /> : icon}
      </div>
      <h3 className="text-sm font-bold text-zinc-950">{uploadedFile ? 'Uploaded Successfully' : title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{uploadedFile ? uploadedFile : description}</p>
    </div>
  );
}

function RangeCard({ label, value, min, max, suffix, onChange }) {
  return (
    <div className="rounded-lg border border-[#d8e5ea] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <label className="text-sm font-semibold text-zinc-950">{label}</label>
        <span className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">
          {value} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#5f8fa0]"
      />
      <div className="mt-2 flex justify-between text-xs font-medium text-zinc-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function InputCard({ label, value, placeholder, onChange }) {
  return (
    <div className="rounded-lg border border-[#d8e5ea] bg-white p-4 shadow-sm">
      <label className="text-sm font-semibold text-zinc-950">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-11 w-full rounded-lg border border-[#c8dbe2] bg-[#f7fbfc] px-4 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#5f8fa0] focus:bg-white focus:ring-4 focus:ring-[#e5f0f4]"
      />
    </div>
  );
}

function SelectCard({ label, value, options, onChange }) {
  return (
    <div className="rounded-lg border border-[#d8e5ea] bg-white p-4 shadow-sm">
      <label className="text-sm font-semibold text-zinc-950">{label}</label>
      <div className="relative mt-3">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-[#c8dbe2] bg-[#f7fbfc] px-4 pr-12 text-sm font-medium text-zinc-900 outline-none transition focus:border-[#5f8fa0] focus:bg-white focus:ring-4 focus:ring-[#e5f0f4]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#6f8790]">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );
}

function ChoiceCard({ label, value, options, onChange }) {
  return (
    <div className="rounded-lg border border-[#d8e5ea] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-zinc-950">{label}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              value === option.value
                ? 'border-[#5f8fa0] bg-[#e6f1f4] text-[#2f5362]'
                : 'border-[#c8dbe2] bg-white text-[#4e6670] hover:bg-[#f3f8fa]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- ICONS ---
function ChevronRightIcon() { return <svg className="h-4 w-4 text-zinc-700" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ChevronDownIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function VerifiedIcon() { return <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M10.55 2.9a2 2 0 0 1 2.9 0l1.03 1.1 1.48-.18a2 2 0 0 1 2.22 2.22L18 7.52l1.1 1.03a2 2 0 0 1 0 2.9L18 12.48l.18 1.48a2 2 0 0 1-2.22 2.22L14.48 16l-1.03 1.1a2 2 0 0 1-2.9 0L9.52 16l-1.48.18a2 2 0 0 1-2.22-2.22L6 12.48l-1.1-1.03a2 2 0 0 1 0-2.9L6 7.52l-.18-1.48a2 2 0 0 1 2.22-2.22L9.52 4l1.03-1.1Zm4.18 6.86a1 1 0 0 0-1.46-1.37l-2.31 2.46-.91-.91a1 1 0 0 0-1.42 1.42l1.64 1.64a1 1 0 0 0 1.44-.03l3.02-3.21Z" /></svg>; }
function TrashIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6.5 7l.7 12.2A2 2 0 0 0 9.2 21h5.6a2 2 0 0 0 2-1.8L17.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function GitHubLogo() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.73c-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.28 9.28 0 0 1 12 7c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.95.68 1.92v2.77c0 .27.18.59.69.49A10.12 10.12 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" /></svg>; }
function LeetCodeLogo() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M14.8 4.2 7.2 11.8a3.4 3.4 0 0 0 0 4.8l2.2 2.2a3.4 3.4 0 0 0 4.8 0l2.3-2.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9.8 14h8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12.2 6.8 14 5a2.8 2.8 0 0 1 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function FitbitLogo() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 6.5A1.5 1.5 0 1 1 7.5 5 1.5 1.5 0 0 1 9 6.5Zm4.5 0A1.5 1.5 0 1 1 12 5a1.5 1.5 0 0 1 1.5 1.5Zm4.5 0A1.5 1.5 0 1 1 16.5 5 1.5 1.5 0 0 1 18 6.5ZM9 12a1.5 1.5 0 1 1-1.5-1.5A1.5 1.5 0 0 1 9 12Zm4.5 0a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Zm4.5 0a1.5 1.5 0 1 1-1.5-1.5A1.5 1.5 0 0 1 18 12Zm-4.5 5.5A1.5 1.5 0 1 1 12 16a1.5 1.5 0 0 1 1.5 1.5Z" /></svg>; }
function LinkedInLogo() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 8.7h3.2V19H5.2V8.7Zm1.6-5A1.85 1.85 0 1 1 6.8 7.4a1.85 1.85 0 0 1 0-3.7Zm3.8 5h3.1v1.4h.04a3.4 3.4 0 0 1 3.06-1.68c3.28 0 3.9 2.16 3.9 4.96V19h-3.24v-5.03c0-1.2-.02-2.74-1.67-2.74-1.68 0-1.94 1.31-1.94 2.66V19h-3.25V8.7Z" /></svg>; }
function BankingLogo() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M4 10h16L12 5 4 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
// NEW ICONS FOR DATA VAULT
function HeartPulseIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 11 5.8l1 1.1 1-1.1a4.4 4.4 0 0 1 7.8 2.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7 12h2l1.2-2.5 2.2 5 1.5-2.5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BriefcaseIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect width="20" height="14" x="2" y="6" rx="2" stroke="currentColor" strokeWidth="2" /></svg>; }
function BankNoteIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><rect width="20" height="12" x="2" y="6" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" /><path d="M6 12h.01M18 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }

export default Onboarding;
