// src/pages/auth/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

import spectropyLogo from '/logo.png';

type Role = 'student' | 'teacher';

export default function LoginForm() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const roleRedirects: Record<string, string> = {
      super_admin: '/superadmin/dashboard',
      client_admin: '/admin/dashboard',
      content_authorizer: '/content-authorizer/dashboard',
      school_owner: '/school-owner/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
    };

    navigate(roleRedirects[user.role] || '/login');
  }, [user, navigate]);

  const resolveIdentifierType = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'email';
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return looksLikeEmail ? 'email' : 'user_id';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const identifierType = resolveIdentifierType(email);
        await login(email.trim(), password, identifierType);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        await register(email, fullName, password, role);
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#e6f0ff,_#f7faff_45%,_#ffffff_100%)] text-slate-900"
      style={{ fontFamily: '"Inter", "Segoe UI", sans-serif' }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');

          @keyframes spectropy-fade {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes spectropy-rise {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute top-40 -left-16 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/90 to-transparent" />
      </div>

      <header className="z-20 border-b border-blue-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={spectropyLogo} alt="Spectropy" className="h-10 w-auto sm:h-12" />
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-[0.35em] text-blue-600 sm:text-xs sm:tracking-[0.45em]">
                Spectropy
              </div>
              <div
                className="text-sm font-bold tracking-tight sm:text-lg"
                style={{ fontFamily: '"Manrope", "Segoe UI", sans-serif' }}
              >
                Learning-Management-System
              </div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm md:flex">
            Secure client access
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-[560px] rounded-3xl border border-blue-100 bg-white p-5 shadow-lg animate-[spectropy-fade_0.6s_ease-out] sm:p-8">
            <div className="text-center">
              <div className="text-sm font-semibold tracking-tight text-blue-700">{isLogin ? 'Login' : 'Register'}</div>
              <h2
                className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]"
                style={{ fontFamily: '"Manrope", "Segoe UI", sans-serif' }}
              >
                {isLogin ? 'Access your Spectropy account' : 'Create your Spectropy account'}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {isLogin ? 'Use your organization credentials to continue.' : 'Fill in the details to get started.'}
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
              )}

              <div className="space-y-1">
                <label className="ml-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {isLogin ? 'Email' : 'Email'}
                </label>
                <input
                  type="email"
                  placeholder="name@institution.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  />
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Instructor</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="ml-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Password</label>
                  {isLogin && <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500">Forgot?</a>}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm font-medium focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm font-medium focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold tracking-tight text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Create Account')}
              </button>
            </form>

            <div className="mt-4 text-center text-sm font-medium">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs font-medium text-blue-700">
              {isLogin ? 'Need access? Contact your client administrator to onboard users.' : 'By registering, you agree to our Terms of Service.'}
            </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-blue-100/70 py-4 text-center text-sm text-slate-500 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <img src={spectropyLogo} alt="Spectropy" className="h-8 w-auto" />
            <span>Spectropy Learning Cloud</span>
          </div>
          <div>Copyright (c) {new Date().getFullYear()} Spectropy.</div>
        </div>
      </footer>
    </div>
  );
}
