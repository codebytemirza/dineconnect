'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Phone,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
  DollarSign,
  Globe,
  BellRing,
  BookOpen,
  Receipt,
  Layers,
  Zap,
  ChevronRight,
  Clock,
  CreditCard,
  ChefHat,
  Monitor,
  Smartphone,
  Flame,
  Send,
  Truck,
} from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';

export default function LandingPage() {
  const router = useRouter();
  const { user, userLoading } = useRestaurant();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Dual Screen Demo State
  const [activeScreenTab, setActiveScreenTab] = useState<'both' | 'phone' | 'kds'>('both');
  const [interactiveOrderStatus, setInteractiveOrderStatus] = useState<'confirmed' | 'cooking' | 'ready' | 'delivered'>('cooking');
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // Auto-redirect if session already exists
  useEffect(() => {
    if (!userLoading) {
      if (user) {
        if (user.role === 'superadmin') {
          router.replace('/admin');
          return;
        } else {
          router.replace('/dashboard');
          return;
        }
      }
      setCheckingAuth(false);
    }
  }, [user, userLoading, router]);

  function triggerInteractiveStatus(status: 'confirmed' | 'cooking' | 'ready' | 'delivered', msg: string) {
    setInteractiveOrderStatus(status);
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 4000);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#060e0b] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-white/50 tracking-wider">Loading DineConnect...</span>
        </div>
      </div>
    );
  }

  const signupPhone = '+923284119134';
  const waSignupLink = `https://wa.me/923284119134?text=Hi%2C%20I%20want%20to%20onboard%20my%20restaurant%20on%20DineConnect%20WhatsApp%20Ordering%20Bot!`;

  return (
    <div className="min-h-screen w-full bg-[#060e0b] text-white flex flex-col selection:bg-[#e8603c] selection:text-white relative overflow-x-hidden font-sans">
      {/* BACKGROUND AMBIENT GLOWS & DYNAMIC AURORA MESH */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Tech Grid Lines */}
        <div className="absolute inset-0 bg-tech-grid opacity-60" />
        {/* Subtle Dot Matrix Matrix */}
        <div className="absolute inset-0 bg-dot-matrix opacity-40" />

        {/* Dynamic Living Aurora Orbs */}
        <div className="absolute -top-32 left-1/4 w-[750px] h-[750px] bg-gradient-to-br from-emerald-600/20 to-teal-500/15 rounded-full blur-[140px] animate-aurora-1" />
        <div className="absolute top-1/3 -right-24 w-[680px] h-[680px] bg-gradient-to-tr from-teal-700/20 to-emerald-500/15 rounded-full blur-[150px] animate-aurora-2" />
        <div className="absolute top-2/3 left-1/6 w-[700px] h-[700px] bg-gradient-to-bl from-emerald-800/15 via-teal-900/15 to-[#e8603c]/15 rounded-full blur-[160px] animate-aurora-3" />
        <div className="absolute -bottom-32 right-1/4 w-[650px] h-[650px] bg-[#e8603c]/12 rounded-full blur-[160px] animate-aurora-1" />
      </div>

      {/* TOP LIVE SYSTEM STATUS TICKER */}
      <div className="relative z-30 w-full bg-[#0a1612] border-b border-white/10 px-4 py-2 text-[11px] font-medium text-white/70 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-emerald-300 font-bold">WhatsApp Cloud API:</span>
            <span>Operational (99.99% Uptime)</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white/80 font-bold">AI Bot Latency:</span>
            <span>1.1s Instant Response</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-bold">Flat PKR 5,000 / mo</span>
            <span>0% Commission on Food</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-[#25D366]" />
            <span className="text-white/60">Onboarding Hotline:</span>
            <a href="tel:+923284119134" className="text-white hover:text-emerald-400 font-mono font-bold">
              +92 328 4119134
            </a>
          </div>
        </div>
      </div>

      {/* NAVIGATION BAR */}
      <nav className="relative z-20 px-6 sm:px-12 py-5 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-[#060e0b]/80 sticky top-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo-dineconnect.png"
            alt="DineConnect logo"
            className="w-10 h-10 rounded-2xl object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white">DineConnect</span>
              <span className="text-[10px] font-bold bg-[#e8603c]/20 text-[#e8603c] px-2 py-0.5 rounded-full border border-[#e8603c]/30">
                PRO 2.0
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/50 hidden sm:block">
              AI-Powered WhatsApp Restaurant OS
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-white/70">
          <a href="#demo" className="hover:text-white transition">Dual Cockpit Demo</a>
          <a href="#features" className="hover:text-white transition">Autonomous AI Engine</a>
          <a href="#pricing" className="hover:text-white transition">Flat Pricing</a>
          <a href="#contact" className="hover:text-white transition">Support</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition border border-white/10"
          >
            Restaurant Login
          </Link>

          <a
            href={waSignupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-teal-900/30 flex items-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Register Restaurant</span>
            <span className="sm:hidden">Join</span>
          </a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 px-6 sm:px-12 pt-10 sm:pt-16 pb-12 max-w-7xl mx-auto w-full text-center space-y-6">
        {/* Live Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-emerald-300 shadow-inner text-xs font-medium mx-auto">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>WhatsApp Native AI · Zero App Downloads for Guests</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white max-w-4xl mx-auto">
          Turn WhatsApp Chats into Kitchen Orders{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-[#e8603c]">
            Automatically
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto leading-relaxed">
          Autonomous AI agent speaks English, Urdu &amp; Arabic, handles custom pizza sizes and crust variations, allows address updates anytime, accepts Cash on Delivery or Online payment, and auto-fires tickets to your live Kitchen Display Screen.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={waSignupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-xl font-bold text-xs bg-[#e8603c] text-white shadow-xl shadow-[#e8603c]/30 hover:bg-[#d44f2b] transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Start Restaurant Onboarding</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 transition-all"
          >
            <span>Access Kitchen Cockpit</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-2 text-xs font-medium text-emerald-200/75">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>0% Commission (100% Food Profit is Yours)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>QR Scan Live in 2 Minutes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>PKR 5,000 / month flat</span>
          </div>
        </div>
      </section>

      {/* DUAL INTERACTIVE LIVE SCREENS (WHATSAPP PHONE + KITCHEN KDS COCKPIT) */}
      <section id="demo" className="relative z-10 px-4 sm:px-10 pb-20 max-w-7xl mx-auto w-full">
        {/* Screen Switcher Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black tracking-wider uppercase text-white/80">
              Interactive System Showcase
            </span>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveScreenTab('both')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeScreenTab === 'both'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Both Screens (Live Dual View)</span>
            </button>

            <button
              onClick={() => setActiveScreenTab('phone')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeScreenTab === 'phone'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer WhatsApp</span>
            </button>

            <button
              onClick={() => setActiveScreenTab('kds')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeScreenTab === 'kds'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Kitchen KDS Cockpit</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Alert Banner */}
        {actionAlert && (
          <div className="mt-4 bg-emerald-600 text-white text-xs font-bold px-6 py-2.5 rounded-2xl text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl shadow-emerald-950/40">
            <Send className="w-4 h-4" />
            <span>{actionAlert}</span>
          </div>
        )}

        {/* The Dual Screen Showcase Container */}
        <div className="mt-6 relative">
          {/* FLOATING CARDS AROUND THE SCREENS */}
          <div className="hidden lg:flex absolute -top-5 -left-4 z-40 animate-float-slow bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-3 px-4 items-center gap-3 text-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">New WhatsApp Order</span>
              <span className="text-[11px] text-slate-500">Just now · Gulberg III, Lahore</span>
            </div>
          </div>

          <div className="hidden lg:flex absolute -bottom-5 left-1/4 z-40 animate-float-delayed bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-3 px-4 items-center gap-3 text-slate-800">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#0f766e] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">Auto-synced to Kitchen KDS</span>
              <span className="text-[11px] text-[#0f766e] font-semibold">Kitchen prep: 14m · WhatsApp Alert Sent</span>
            </div>
          </div>

          <div className="hidden lg:flex absolute -top-4 -right-4 z-40 animate-float-chip bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-3 px-4 items-center gap-3 text-slate-800">
            <div className="w-9 h-9 rounded-xl bg-[#e8603c]/15 text-[#e8603c] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">COD / Online Transfer</span>
              <span className="text-[11px] text-emerald-600 font-semibold">PKR 3,399 · Confirmed</span>
            </div>
          </div>

          {/* MAIN DUAL DISPLAY GRID */}
          <div className={`grid gap-8 items-start ${
            activeScreenTab === 'both'
              ? 'grid-cols-1 lg:grid-cols-12'
              : 'grid-cols-1 max-w-2xl mx-auto'
          }`}>
            {/* SCREEN 1: WHATSAPP SMARTPHONE MOCKUP */}
            {(activeScreenTab === 'both' || activeScreenTab === 'phone') && (
              <div className={`${activeScreenTab === 'both' ? 'lg:col-span-5' : 'w-full'} flex justify-center`}>
                <div className="relative w-full max-w-[360px] bg-gradient-to-b from-[#1c322b] to-[#0c1a15] rounded-[2.8rem] p-3 shadow-[0_25px_60px_rgba(0,0,0,0.65)] border border-white/20">
                  {/* Phone Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/60 rounded-full z-30" />

                  {/* Phone Screen Container */}
                  <div className="relative w-full bg-[#ece5dd] rounded-[2.2rem] overflow-hidden flex flex-col h-[560px] shadow-inner text-slate-900">
                    {/* WhatsApp Top Header */}
                    <div className="bg-[#075e54] px-4 pt-6 pb-3 text-white flex items-center justify-between shadow">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#075e54] font-bold text-xs shadow-sm">
                          🍔
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white leading-none">The Burger Joint</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          </div>
                          <span className="text-[10px] text-emerald-100/80">Verified DineConnect AI</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full text-emerald-100">
                        ONLINE
                      </span>
                    </div>

                    {/* Chat Stream */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-2 text-[11.5px] leading-relaxed">
                      {/* Customer Greeting */}
                      <div className="flex justify-end">
                        <div className="bg-[#d9fdd3] text-slate-900 rounded-lg rounded-tr-none px-3 py-1.5 max-w-[85%] shadow-sm">
                          <p>Salam! I want to order some food.</p>
                          <div className="text-right text-[9px] text-slate-500 mt-0.5">19:02 ✓✓</div>
                        </div>
                      </div>

                      {/* Bot Language First Response */}
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-900 rounded-lg rounded-tl-none px-3 py-2 max-w-[92%] shadow-sm border-l-2 border-[#0f766e] space-y-1">
                          <p className="font-semibold text-[#0f766e]">The Burger Joint AI Concierge</p>
                          <p>Welcome! براہ کرم اپنی زبان منتخب کریں / Please choose your language:</p>
                          <p className="text-[10.5px] text-slate-600">1. English<br />2. Roman Urdu / اردو<br />3. Arabic</p>
                        </div>
                      </div>

                      {/* Customer chooses Roman Urdu */}
                      <div className="flex justify-end">
                        <div className="bg-[#d9fdd3] text-slate-900 rounded-lg rounded-tr-none px-3 py-1.5 shadow-sm">
                          Roman Urdu please
                        </div>
                      </div>

                      {/* Bot checks sizes from Knowledge Base */}
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-900 rounded-lg rounded-tl-none px-3 py-2 max-w-[92%] shadow-sm border-l-2 border-[#0f766e] space-y-1">
                          <p>Bohat shukriya! Hamare pizza sizes aur crust options:</p>
                          <p className="text-[10.5px] text-slate-600">
                            • Small 7" (PKR 650)<br />
                            • Medium 10" (PKR 1,250)<br />
                            • Large 13" (PKR 1,850)<br />
                            Crust: Deep Pan, Thin, Cheese Stuffed (+PKR 250)
                          </p>
                        </div>
                      </div>

                      {/* Customer specifies custom pizza & cheeseburger */}
                      <div className="flex justify-end">
                        <div className="bg-[#d9fdd3] text-slate-900 rounded-lg rounded-tr-none px-3 py-1.5 max-w-[88%] shadow-sm">
                          1 Large Fajita Pizza Cheese Stuffed Crust and 1 Classic Cheeseburger. Name: Ali, Gulberg III Lahore.
                        </div>
                      </div>

                      {/* Bot asks Payment Method & shows breakdown */}
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-900 rounded-lg rounded-tl-none px-3 py-2 max-w-[92%] shadow-sm border-l-2 border-[#0f766e] space-y-1">
                          <p className="font-bold text-[#0f766e]">Aap payment kaise karein ge?</p>
                          <p>1. *Cash on Delivery (COD)*<br />2. *Online Bank Transfer*</p>
                          <div className="bg-slate-50 p-2 rounded text-[10.5px] border border-slate-200/80">
                            <div>• 1x Large Pizza (Cheese Stuffed): PKR 2,100</div>
                            <div>• 1x Classic Cheeseburger: PKR 1,299</div>
                            <div className="font-bold text-slate-900 pt-0.5">Total: PKR 3,399</div>
                          </div>
                        </div>
                      </div>

                      {/* Customer selects COD */}
                      <div className="flex justify-end">
                        <div className="bg-[#d9fdd3] text-slate-900 rounded-lg rounded-tr-none px-3 py-1.5 shadow-sm">
                          Cash on Delivery please!
                        </div>
                      </div>

                      {/* Bot Confirmation Ticket */}
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-900 rounded-lg rounded-tl-none px-3 py-2 max-w-[92%] shadow-sm border-l-4 border-emerald-500">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10.5px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Order #DC-842 Confirmed!</span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 mt-1">
                            Status: <strong className="text-emerald-700 uppercase">{interactiveOrderStatus}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            You can change your delivery address or contact number anytime!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Input Bar */}
                    <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-slate-200">
                      <div className="bg-white rounded-full flex-1 py-1.5 px-3 text-[11px] text-slate-400 border border-slate-200/80">
                        Change address or phone number...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#075e54] text-white flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: KITCHEN OPERATIONS KDS COCKPIT */}
            {(activeScreenTab === 'both' || activeScreenTab === 'kds') && (
              <div className={`${activeScreenTab === 'both' ? 'lg:col-span-7' : 'w-full'}`}>
                <div className="bg-[#0d1c18] rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[560px]">
                  {/* Cockpit Window Header */}
                  <div className="bg-[#081310] px-5 py-3.5 flex items-center justify-between border-b border-white/10 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                      <span className="font-mono text-white/50 text-[11px] hidden sm:inline">
                        app.dineconnect.io/dashboard
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live KDS Socket: Connected</span>
                    </div>
                  </div>

                  {/* KDS Interior Desk */}
                  <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4 text-xs">
                    {/* Metrics Top Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="text-white/40 text-[10px] font-bold uppercase">Orders in Queue</div>
                        <div className="text-xl font-black text-white mt-0.5">8 Active</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="text-white/40 text-[10px] font-bold uppercase">Avg Cooking Time</div>
                        <div className="text-xl font-black text-emerald-400 mt-0.5">14m 20s</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="text-white/40 text-[10px] font-bold uppercase">Today's Sales</div>
                        <div className="text-xl font-black text-[#e8603c] mt-0.5">PKR 84,200</div>
                      </div>
                    </div>

                    {/* Active Ticket Card (Order #DC-842) */}
                    <div className="bg-white/[0.04] rounded-2xl border border-emerald-500/30 p-4 space-y-3 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-emerald-400">#DC-842</span>
                          <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {interactiveOrderStatus.toUpperCase()}
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            COD · PKR 3,399
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/60 text-[11px] font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Timer: 11m 45s remaining</span>
                        </div>
                      </div>

                      {/* Customer & Location Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div>
                          <span className="text-white/40 block">Customer:</span>
                          <span className="font-bold text-white">Ali (+92 300 1234567)</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Address:</span>
                          <span className="font-semibold text-white/90">Gulberg III, Lahore</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">1x Chicken Fajita Pizza (Large 13")</span>
                          <span className="text-emerald-400 font-mono">PKR 2,100</span>
                        </div>
                        <div className="text-[10px] text-amber-300 font-medium pl-3">
                          ↳ Crust: Cheese Stuffed Crust (+PKR 250) · Extra Sauce
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-white">1x Classic Cheeseburger</span>
                          <span className="text-emerald-400 font-mono">PKR 1,299</span>
                        </div>
                        <div className="text-[10px] text-white/50 pl-3">
                          ↳ Fries included · Mayo garlic dip
                        </div>
                      </div>

                      {/* Interactive Action Controls (Simulates kitchen action) */}
                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => triggerInteractiveStatus('cooking', '🔥 Kitchen fired grill: WhatsApp alert sent to Ali that food is in prep!')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            interactiveOrderStatus === 'cooking'
                              ? 'bg-amber-500 text-black shadow-md'
                              : 'bg-white/10 text-white/80 hover:bg-white/15'
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Fire / Cooking</span>
                        </button>

                        <button
                          onClick={() => triggerInteractiveStatus('ready', '🛎️ Order ready: WhatsApp notification sent to customer for pickup!')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            interactiveOrderStatus === 'ready'
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'bg-white/10 text-white/80 hover:bg-white/15'
                          }`}
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Mark Ready</span>
                        </button>

                        <button
                          onClick={() => triggerInteractiveStatus('delivered', '🛵 Order Dispatched: Live WhatsApp rider tracking link sent to customer!')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            interactiveOrderStatus === 'delivered'
                              ? 'bg-teal-500 text-white shadow-md'
                              : 'bg-white/10 text-white/80 hover:bg-white/15'
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Out for Delivery</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* THREE PILLARS FEATURE GRID */}
      <section id="features" className="relative z-10 px-6 sm:px-12 py-24">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Complete Feature Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Built for High-Volume Restaurant Efficiency
            </h2>
            <p className="text-xs sm:text-sm text-white/50 max-w-xl mx-auto">
              Everything required to run automated direct orders, customize portions and crusts, and manage operations in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0b1613] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/30 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Multilingual First Protocol</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                The agent detects the customer's preferred language upon greeting (English, Roman Urdu, Urdu, or Arabic) and maintains that language throughout the ordering and payment flow.
              </p>
            </div>

            <div className="bg-[#0b1613] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/30 transition">
              <div className="w-12 h-12 rounded-2xl bg-[#e8603c]/10 border border-[#e8603c]/20 text-[#e8603c] flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Sizes &amp; Portions in KB</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Menu concepts are never rigid. Pizza sizes (Small, Medium, Large, Party) and custom crusts (Pan, Thin, Cheese Stuffed) live dynamically in the Knowledge Base so the agent answers with exact portion pricing.
              </p>
            </div>

            <div className="bg-[#0b1613] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/30 transition">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">COD &amp; Online Payment + Full CRUD</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Agent presents COD and Online Bank Transfer details. Customers can change their delivery address, update contact phone, or cancel orders directly on WhatsApp before delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION (PKR 5,000 / month flat) */}
      <section id="pricing" className="relative z-10 px-6 sm:px-12 py-24">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e8603c] bg-[#e8603c]/10 px-3.5 py-1.5 rounded-full border border-[#e8603c]/20">
              Transparent Flat Rate
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Zero Commissions. One Predictable Monthly Fee.
            </h2>
            <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto">
              Aggregators take 25% to 35% of your food sales. DineConnect costs a simple flat rate.
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#0e211b] to-[#091511] p-8 sm:p-12 rounded-3xl border border-emerald-500/30 shadow-2xl max-w-lg mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div className="text-left">
                <h3 className="text-xl font-black text-white">Restaurant Professional</h3>
                <p className="text-xs text-emerald-400">All features &amp; unlimited WhatsApp orders</p>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                RECOMMENDED
              </span>
            </div>

            <div className="text-left space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white">PKR 5,000</span>
                <span className="text-sm text-white/50">/ month</span>
              </div>
              <div className="text-xs text-emerald-300 font-semibold">0% commission on orders</div>
            </div>

            <div className="space-y-3 pt-2 text-left text-xs">
              {[
                'Unlimited WhatsApp bot orders & AI conversations',
                'Live Kitchen Display System (KDS) cockpit',
                'English, Roman Urdu, Urdu & Arabic AI engine',
                'Custom menu categories & Knowledge Base pizza sizing',
                'Address & phone modification anytime on WhatsApp',
                'Automated status change WhatsApp alerts to customers',
                'Cash on Delivery & Online Bank Transfer support',
                'Dedicated onboarding hotline & 24/7 technical support',
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <a
                href={waSignupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Onboard via WhatsApp (+92 328 4119134)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & SUPPORT FOOTER */}
      <footer id="contact" className="relative z-10 border-t border-white/5 bg-transparent px-6 sm:px-12 py-12 text-xs text-white/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-dineconnect.png"
              alt="DineConnect logo"
              className="w-8 h-8 rounded-xl object-contain"
            />
            <div>
              <div className="font-bold text-white text-sm">DineConnect</div>
              <div className="text-[11px] text-white/40">AI WhatsApp Restaurant Ordering Platform</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="tel:+923284119134"
              className="flex items-center gap-1.5 text-white hover:text-emerald-400 font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call: +92 328 4119134</span>
            </a>

            <a
              href={waSignupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp: +92 328 4119134</span>
            </a>
          </div>

          <div className="text-[11px] text-white/40">
            © {new Date().getFullYear()} DineConnect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
