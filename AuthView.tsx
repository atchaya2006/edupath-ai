import React, { useState } from 'react';
import {
  Compass,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Target,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthViewProps {
  initialMode?: 'login' | 'signup' | 'forgot';
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login' }) => {
  const { login, signup, loginAsDemo, resetPassword, registeredUsers } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset-success'>(initialMode);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [targetRole, setTargetRole] = useState('Data Analyst');
  const [weeklyHours, setWeeklyHours] = useState(7);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Reset password states
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password, rememberMe });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Please accept the Terms of Service to create an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        fullName,
        email,
        password,
        targetRole,
        weeklyHours,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Please enter a valid registered email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(resetEmail, newPassword);
      setSuccessMsg('Your password has been successfully updated! You can now log in.');
      setMode('login');
      setEmail(resetEmail);
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not reset password. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = async () => {
    clearMessages();
    setIsSubmitting(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/40">
        
        {/* Left / Top Branded Hero Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Background Accents */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                  EduPath <span className="text-indigo-300">AI</span>
                </span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">
                  Adaptive Career Agent
                </p>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Multi-User Autonomous Learning</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
                Your career goals, tailored daily by AI.
              </h2>
              <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed max-w-sm">
                Each learner gets a private, isolated workspace with real-time skill extraction, weekly roadmaps, and intelligent assessments.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 mt-8 space-y-3 pt-6 border-t border-indigo-600/50">
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Independent account data & continuous session persistence</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Personalized skill gap & milestone path replanning</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Interactive AI Quizzes, Coding Drills & Practice Reviews</span>
            </div>
          </div>

          {/* Quick Demo Login CTA Box */}
          <div className="relative z-10 mt-8 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold text-white">Instant Evaluator Access</span>
              </div>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/30">
                One-Click
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1">
              Explore the full system immediately with Alex's pre-populated Data Analyst profile and learning telemetry.
            </p>
            <button
              id="auth-demo-alex-btn"
              type="button"
              onClick={handleDemoClick}
              disabled={isSubmitting}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Continue as Alex Rivera (Demo Profile)</span>
            </button>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white">
          
          {/* Header Switcher */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot' && 'Reset Your Password'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login' && 'Sign in to your private EduPath AI workspace'}
                {mode === 'signup' && 'Start your personalized career acceleration journey'}
                {mode === 'forgot' && 'Enter your email to set a new password'}
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                id="auth-tab-login-btn"
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log In
              </button>
              <button
                id="auth-tab-signup-btn"
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearMessages();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Authentication Notice</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="learner@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      clearMessages();
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-fullname-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Career Goal
                  </label>
                  <div className="relative">
                    <Target className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    >
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Frontend Engineer">Frontend Engineer</option>
                      <option value="Full-Stack Developer">Full-Stack Developer</option>
                      <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                      <option value="Cloud Architect">Cloud Architect</option>
                      <option value="Product Manager">Product Manager</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Weekly Commitment
                  </label>
                  <select
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value={4}>4 hours / week (Light)</option>
                    <option value={7}>7 hours / week (Recommended)</option>
                    <option value={12}>12 hours / week (Intensive)</option>
                    <option value={20}>20 hours / week (Full immersion)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter"
                      className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="signup-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="signup-terms" className="text-[11px] text-slate-600">
                  I agree to the EduPath AI Privacy Policy and Terms of Learning
                </label>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Create My Account & Setup Profile'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-new-password-input"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-confirm-new-password-input"
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    clearMessages();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          )}

          {/* Registered Accounts Quick Switcher (If any) */}
          {registeredUsers.length > 0 && mode === 'login' && (
            <div className="mt-8 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Stored User Accounts ({registeredUsers.length})</span>
                <span>Select to Autofill</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {registeredUsers.map((regUser) => (
                  <button
                    key={regUser.id}
                    type="button"
                    onClick={() => {
                      setEmail(regUser.email);
                      setPassword('password123');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-left transition-colors flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                      {regUser.fullName.charAt(0)}
                    </div>
                    <div className="text-[11px]">
                      <span className="font-semibold text-slate-800 block leading-tight">
                        {regUser.fullName}
                      </span>
                      <span className="text-[9px] text-slate-400 block leading-none">
                        {regUser.targetRole}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
