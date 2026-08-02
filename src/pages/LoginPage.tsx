import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, ChevronRight, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { DEMO_ACCOUNTS, ROLE_LABELS } from '../types';

export default function LoginPage() {
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const doSeed = async () => {
      const key = 'hse-ops-ai_demo_seeded_v2';
      if (sessionStorage.getItem(key)) { setSeedDone(true); return; }
      setSeeding(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-demo-users`,
          { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) sessionStorage.setItem(key, '1');
      } catch { /* silent — accounts may already exist */ }
      setSeeding(false);
      setSeedDone(true);
    };
    doSeed();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await login(email.trim(), password);
    } catch {
      setLocalError('Invalid credentials. Select a demo account below to auto-fill.');
    }
  };

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setLocalError('');
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-4 border-flame-500" />
          <div className="absolute bottom-40 right-20 w-40 h-40 rounded-full border-4 border-flame-400" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2" />
        </div>
        {/* NNPC green accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-flame-600 via-flame-500 to-flame-400" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-flame-500 rounded-xl flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl leading-none">HSE OPS AI</div>
              <div className="text-flame-400 text-xs font-semibold uppercase tracking-wider mt-0.5">NNPC Ltd</div>
            </div>
          </div>
          <p className="text-navy-400 text-sm mt-2">HSE Division · Operational Support</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              AI-Powered HSE<br />Operational Support
            </h1>
            <p className="text-navy-300 text-lg leading-relaxed">
              Instant access to NNPC Ltd procedures, risk assessment tools, and safety guidance — wherever you are in the field.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Knowledge Documents', value: '12+' },
              { label: 'Emergency Cards', value: '8' },
              { label: 'AI Availability', value: '24/7' },
              { label: 'HSE Categories', value: '15' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-flame-500/30 transition-colors">
                <div className="text-2xl font-bold text-flame-400">{stat.value}</div>
                <div className="text-navy-400 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-flame-400 animate-pulse" />
          <span className="text-navy-400 text-sm">NUPRC & NOSDRA Compliant Platform</span>
        </div>
      </div>

      {/* Login panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16 overflow-y-auto">
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-flame-500 rounded-xl flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-none">HSE OPS AI</div>
            <div className="text-flame-400 text-xs font-semibold uppercase tracking-wider">NNPC Ltd</div>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Sign in</h2>
            <p className="text-navy-400 mt-1 text-sm">NNPC Ltd Employee HSE Portal</p>
          </div>

          {seeding && (
            <div className="mb-4 flex items-center gap-2 text-navy-400 text-sm bg-white/5 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              Setting up demo environment...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-navy-400">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@safeops.demo" className="input bg-white/5 border-white/10 text-white placeholder-navy-500 focus:border-flame-400" required autoComplete="email" />
            </div>
            <div>
              <label className="label text-navy-400">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input bg-white/5 border-white/10 text-white placeholder-navy-500 focus:border-flame-400 pr-10" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {displayedError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-red-400 text-sm">{displayedError}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !seedDone} className="w-full btn-primary justify-center py-3 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : <>Sign In <ChevronRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-navy-500 text-xs font-medium uppercase tracking-wider">Demo Accounts</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map(account => (
                <button key={account.email} onClick={() => handleDemoLogin(account)} disabled={loading} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-flame-400/40 transition-all group text-left">
                  <div className="w-8 h-8 rounded-lg bg-flame-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-flame-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{account.name}</div>
                    <div className="text-navy-400 text-xs">{ROLE_LABELS[account.role]} · {account.employeeId}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-500 group-hover:text-flame-400 transition-colors" />
                </button>
              ))}
            </div>
            <p className="text-navy-500 text-xs mt-3 text-center">
              Password for all accounts: <span className="font-mono text-navy-400">SafeOps2024!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
