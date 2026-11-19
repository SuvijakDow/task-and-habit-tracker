import React, { useState, lazy, Suspense } from 'react';
import {
  Settings,
  CheckSquare,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CalendarDays,
  Flame,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { normalizeProfilePhotoURL } from '@/services/userService';
const MainPage = lazy(() => import('./MainPage').then((m) => ({ default: m.MainPage })));
const SettingsModal = lazy(() => import('@/components/modals/SettingsModal').then((m) => ({ default: m.default || m.SettingsModal })));


type AuthMode = 'login' | 'signup' | 'profile';

export function AuthPage() {
  const { user, userProfile, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  const handleConfirmLogout = async () => {
    try {
      setIsSubmitting(true);
      const { signOut } = await import('@/services/authService');
      await signOut();
      setIsSignOutConfirmOpen(false);
    } catch (err) {
      setError('Could not sign out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-live="polite">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Use Firestore profile data, fall back to Auth data while loading
    const profileName = userProfile?.displayName || user.displayName || user.email;
    const profilePhoto = normalizeProfilePhotoURL(userProfile?.photoURL || user.photoURL || '');

    return (
      <div className="min-h-screen">
        {/* Profile header with logout */}
        <div className="bg-gradient-to-r from-[#14082e] via-[#1c0b42] to-[#14082e] border-b border-purple-800/45 shadow-md relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute left-1/4 -top-10 w-64 h-24 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -bottom-10 w-64 h-24 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 md:py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 shadow-md shadow-purple-500/30 shrink-0">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={profileName || 'Profile'}
                      className="h-8 w-8 md:h-10 md:w-10 rounded-full border-2 border-slate-900 object-cover bg-slate-900"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full border-2 border-slate-900 bg-purple-900 text-purple-200 font-extrabold flex items-center justify-center text-xs md:text-sm">
                      {(profileName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-bold text-white truncate tracking-tight">
                    {profileName}
                  </h1>
                  <p className="text-purple-200/80 text-[11px] md:text-xs mt-0.5 font-medium truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border border-white/20 backdrop-blur-md transition-all flex items-center justify-center flex-shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  title="Settings"
                  aria-label="Open settings"
                >
                  <Settings size={17} />
                </button>
                <button
                  onClick={() => setIsSignOutConfirmOpen(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 min-h-[38px] sm:min-h-[40px] bg-white/10 hover:bg-white/20 text-purple-100 hover:text-white font-bold rounded-xl border border-white/20 backdrop-blur-md transition-all disabled:opacity-50 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main app content */}
        <Suspense fallback={<div className="p-4">Loading app...</div>}>
          <MainPage />
        </Suspense>

        {/* Settings Modal */}
        <Suspense>
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </Suspense>

        {/* Sign Out Confirmation Modal */}
        {isSignOutConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="modal-enter w-full max-w-sm rounded-2xl border border-purple-100/90 bg-white/95 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(120,87,255,0.25)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 text-white shadow-md shadow-purple-500/30">
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Sign Out</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Are you sure you want to sign out?</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignOutConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[40px] rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[40px] rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-sm font-bold text-white shadow-md shadow-purple-500/25 hover:brightness-110 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginData.email || !loginData.password) {
      setError('Enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { signIn } = await import('@/services/authService');
      await signIn(loginData.email, loginData.password);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      if (errorMessage.includes('user-not-found')) {
        setError('No account found for this email. Check the address or create an account.');
      } else if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Enter a valid email address, like name@example.com.');
      } else if (errorMessage.includes('too-many-requests')) {
        setError('Too many attempts. Wait a moment, then try again.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network issue. Check your connection and try again.');
      } else {
        setError('Could not sign in right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError('Complete all required fields.');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match. Re-enter both fields.');
      return;
    }

    if (signupData.password.length < 6) {
      setError('Use at least 6 characters for your password.');
      return;
    }

    if (signupData.displayName.trim().length === 0) {
      setError('Enter a display name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { signUp } = await import('@/services/authService');
      await signUp(signupData.email, signupData.password, signupData.displayName);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign up';
      if (errorMessage.includes('email-already-in-use')) {
        setError('This email is already in use. Sign in or use a different email.');
      } else if (errorMessage.includes('weak-password')) {
        setError('Use at least 6 characters for your password.');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Enter a valid email address, like name@example.com.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network issue. Check your connection and try again.');
      } else {
        setError('Could not create your account right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setIsSubmitting(true);
      const { signInWithGoogle } = await import('@/services/authService');
      await signInWithGoogle();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in with Google';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Google sign-in was cancelled.');
      } else if (errorMessage.includes('popup-blocked')) {
        setError('Pop-up was blocked. Allow pop-ups for this site, then try again.');
      } else if (errorMessage.includes('network-request-failed')) {
        setError('Network issue. Check your connection and try again.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToLogin = () => {
    setMode('login');
    setError(null);
    setShowPassword(false);
    setLoginData({ email: '', password: '' });
  };

  const switchToSignup = () => {
    setMode('signup');
    setError(null);
    setShowPassword(false);
    setSignupData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    });
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-3 sm:p-5 lg:p-6 relative overflow-hidden">
      {/* Subtle ambient decorative glow behind card */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-pink-400/20 blur-3xl" />
      </div>

      {/* Main Split Showcase Card — engineered to fit cleanly in 100% viewport without scrolling */}
      <div className="page-enter relative z-10 w-full max-w-[440px] lg:max-w-[900px] grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden bg-white border-2 border-purple-200/90 shadow-[0_24px_64px_rgba(88,28,135,0.2)]">
        {/* Left Brand & Feature Showcase Panel (Desktop / iPad Landscape lg+) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-7 xl:p-8 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white relative overflow-hidden">
          <div className="absolute -right-14 -top-14 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-14 -bottom-14 w-52 h-52 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

          {/* Top Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md shadow-md">
                <CheckSquare className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white">TaskTracker</span>
                </div>
                <span className="text-[11px] font-medium text-purple-200/90">
                  Minimal Task &amp; Habit Companion
                </span>
              </div>
            </div>

            <div className="mt-7">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold text-pink-200 mb-3">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Stay focused, stress less</span>
              </div>
              <h1 className="text-2xl xl:text-[26px] font-black leading-tight tracking-tight text-white">
                Organize every day with clarity.
              </h1>
              <p className="mt-2 text-xs xl:text-[13px] text-purple-200/90 leading-relaxed">
                Plan tasks with subtask deadlines, build lasting daily habits, and visualize your consistency in one calm workspace.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 space-y-2.5 my-6">
            <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Smart Deadlines &amp; Calendar</p>
                <p className="text-[11px] text-purple-200/85 leading-snug">
                  Track tasks &amp; subtask milestones side by side
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-xl bg-pink-400/20 border border-pink-300/30 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-pink-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Daily Routines &amp; Streaks</p>
                <p className="text-[11px] text-purple-200/85 leading-snug">
                  Flexible schedules, multi-routines &amp; partial goals
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Visual Consistency Insights</p>
                <p className="text-[11px] text-purple-200/85 leading-snug">
                  Activity heatmaps &amp; real-time cloud sync
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Note */}
          <div className="relative z-10 flex items-center gap-1.5 text-[11px] font-medium text-purple-200/75">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Secured &amp; synced with Firebase Cloud</span>
          </div>
        </div>

        {/* Mobile / Tablet Compact Brand Header Strip (< lg) */}
        <div className="lg:hidden px-5 py-4 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-pink-500/25 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-sm shrink-0">
                <CheckSquare className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                  TaskTracker
                </h1>
                <p className="text-[11px] font-medium text-purple-200/90">
                  Your minimal task &amp; habit companion
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-pink-200">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Cloud Sync
            </span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-5 sm:p-7 lg:p-8 flex flex-col justify-center bg-white">
          {/* Heading + Segmented Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {mode === 'login'
                  ? 'Sign in to access your tasks & habits'
                  : 'Start organizing your day in seconds'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:inline-flex p-1 bg-purple-100/75 border border-purple-200/90 rounded-xl shrink-0">
              <button
                type="button"
                onClick={switchToLogin}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  mode === 'login'
                    ? 'bg-white text-purple-800 shadow-xs'
                    : 'text-gray-600 hover:text-purple-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={switchToSignup}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  mode === 'signup'
                    ? 'bg-white text-purple-800 shadow-xs'
                    : 'text-gray-600 hover:text-purple-800'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div role="alert" className="mb-4 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Form Content */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="w-full h-10 sm:h-11 pl-10 pr-3.5 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="w-full h-10 sm:h-11 pl-10 pr-10 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-purple-600 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 sm:h-11 mt-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-bold text-gray-700 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      name="displayName"
                      value={signupData.displayName}
                      onChange={handleSignupChange}
                      placeholder="Your name"
                      autoComplete="name"
                      disabled={isSubmitting}
                      className="w-full h-10 pl-9 pr-3 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      name="email"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      className="w-full h-10 pl-9 pr-3 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-bold text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={signupData.password}
                      onChange={handleSignupChange}
                      placeholder="Min 6 chars"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="w-full h-10 pl-9 pr-9 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-purple-600 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-xs font-bold text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="w-full h-10 pl-9 pr-3 bg-purple-50/35 border border-purple-200/90 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 sm:h-11 mt-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 border-t border-purple-100" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              or continue with
            </span>
            <div className="flex-1 border-t border-purple-100" />
          </div>

          {/* Official Full-Color Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full h-10 sm:h-11 bg-white hover:bg-purple-50/60 border border-purple-200 hover:border-purple-300 text-gray-800 text-sm font-bold rounded-xl shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Footer Switch Link */}
          <p className="text-center text-gray-500 text-xs mt-4 font-medium">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={switchToSignup}
                  className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
