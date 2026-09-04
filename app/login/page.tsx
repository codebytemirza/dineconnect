'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, User, ShieldCheck, Store, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser, refreshRestaurants } = useRestaurant();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Invalid credentials. Please try again.');
        return;
      }

      await refreshUser();
      await refreshRestaurants();

      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
      } else if (json.user?.role === 'superadmin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0a1411] text-white flex flex-col justify-between selection:bg-[#e8603c] selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 sm:px-12 py-6 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e8603c] to-orange-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-orange-500/20">
            D
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Dine</span>
            <span className="text-[#e8603c]">Connect</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold text-white/60 hover:text-white transition flex items-center gap-1.5"
        >
          <span>Back to Landing Page</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0f766e]/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#e8603c]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto shadow-lg shadow-teal-900/40 p-1.5">
                <img src="/logo-dineconnect.png" alt="DineConnect logo" className="h-full w-full object-contain" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Sign in to DineConnect
              </h1>
              <p className="text-xs text-white/50">
                Enter your credentials to access your SaaS or Restaurant operations desk.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 block">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dineconnect or restaurant username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#0f766e] to-teal-700 hover:from-[#0d5f58] hover:to-teal-800 text-white py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Secure Account Notice */}
            <div className="pt-4 border-t border-white/5 text-center text-[11px] text-white/50">
              Need access or forgot your password? Contact onboarding support at{' '}
              <a
                href="https://wa.me/923284119134"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 font-bold hover:underline"
              >
                +92 328 4119134
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-white/30 border-t border-white/5">
        DineConnect &copy; 2026. WhatsApp Restaurant Order Automation Platform.
      </footer>
    </div>
  );
}
