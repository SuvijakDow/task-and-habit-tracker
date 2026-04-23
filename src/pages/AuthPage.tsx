import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signIn, signUp, signOut, signInWithGoogle } from '@/services/authService';
import { MainPage } from './MainPage';

type AuthMode = 'login' | 'signup' | 'profile';

export function AuthPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleLogout = async () => {
    try {
      setIsSubmitting(true);
      await signOut();
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
    return (
      <div className="min-h-screen">
        {/* Profile header with logout */}
        <div className="bg-white/60 backdrop-blur-md border-b border-white/70 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 md:py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-white/70 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                    {user.displayName || user.email}
                  </h1>
                  <p className="text-gray-600 text-xs mt-0.5 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-white/80 text-indigo-700 font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 text-xs flex-shrink-0 whitespace-nowrap"
              >
                {isSubmitting ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>

        {/* Main app content */}
        <MainPage />
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
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(loginData.email, loginData.password);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      if (errorMessage.includes('user-not-found')) {
        setError('No account found with this email');
      } else if (errorMessage.includes('wrong-password')) {
        setError('Incorrect password');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Invalid email address');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (signupData.displayName.trim().length === 0) {
      setError('Display name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(signupData.email, signupData.password, signupData.displayName);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign up';
      if (errorMessage.includes('email-already-in-use')) {
        setError('Email already in use');
      } else if (errorMessage.includes('weak-password')) {
        setError('Password is too weak');
      } else if (errorMessage.includes('invalid-email')) {
        setError('Invalid email address');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in with Google';
      if (errorMessage.includes('popup-closed-by-user')) {
        setError('Sign in cancelled');
      } else if (errorMessage.includes('popup-blocked')) {
        setError('Pop-up was blocked. Please allow pop-ups and try again');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">TaskTracker</h1>
          <p className="text-gray-600">Your minimal task and habit companion</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setLoginData({ email: '', password: '' });
              }}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${
                mode === 'login'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
                setSignupData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  displayName: '',
                });
              }}
              className={`flex-1 py-4 font-semibold text-center transition-colors ${
                mode === 'signup'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form Content */}
          <div className="px-6 py-8">
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    name="displayName"
                    value={signupData.displayName}
                    onChange={handleSignupChange}
                    placeholder="John Doe"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    name="password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type="password"
                    name="confirmPassword"
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-gray-600 text-sm">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full mt-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isSubmitting ? 'Signing in...' : 'Sign in with Google'}
            </button>

            {/* Footer text */}
            <p className="text-center text-gray-600 text-sm mt-6">
              {mode === 'login'
                ? "Don't have an account? Switch to Sign Up above"
                : 'Already have an account? Switch to Sign In above'}
            </p>
          </div>
        </div>

        {/* Powered by Firebase */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Powered by Firebase
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
