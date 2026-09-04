'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  MessageSquare,
  BookOpen,
  Store,
  Plus,
  ChevronDown,
  Check,
  QrCode,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';
import { WhatsAppModal } from './whatsapp-modal';
import { AddRestaurantModal } from './add-restaurant-modal';

export function Sidebar() {
  const pathname = usePathname();
  const {
    restaurants,
    currentRestaurant,
    currentRestaurantId,
    setCurrentRestaurantId,
    user,
    logout,
  } = useRestaurant();

  const [activeConversations, setActiveConversations] = useState<number>(0);
  const [bridgeStatus, setBridgeStatus] = useState<string>('disconnected');
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isAddRestaurantModalOpen, setIsAddRestaurantModalOpen] = useState<boolean>(false);

  // Auto-hide on landing page, login page, or admin dashboard
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/admin')) {
    return null;
  }

  async function fetchStatus() {
    if (!currentRestaurantId) return;
    try {
      const res = await fetch(`/api/stats?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success) {
        setActiveConversations(json.data.activeConversations || 0);
      }

      const bridgeRes = await fetch(
        `/api/whatsapp/status?restaurantId=${encodeURIComponent(currentRestaurantId)}`
      );
      const bridgeJson = await bridgeRes.json();
      if (bridgeJson.success && bridgeJson.data) {
        setBridgeStatus(bridgeJson.data.status);
      }
    } catch (err) {
      // Silently catch fetch errors
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [currentRestaurantId]);

  const isBridgeConnected = bridgeStatus === 'connected';

  const navItems = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: ShoppingBag,
      active: pathname.startsWith('/orders'),
    },
    {
      href: '/menu',
      label: 'Menu',
      icon: UtensilsCrossed,
      active: pathname.startsWith('/menu'),
    },
    {
      href: '/knowledge-base',
      label: 'Knowledge Base',
      icon: BookOpen,
      active: pathname.startsWith('/knowledge-base'),
    },
    {
      href: '/conversations',
      label: 'Conversations',
      icon: MessageSquare,
      active: pathname.startsWith('/conversations'),
      badge: activeConversations,
    },
  ];

  return (
    <>
      <aside className="w-64 bg-[#0f231d] text-white flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none border-r border-white/5">
        <div className="flex flex-col overflow-hidden">
          {/* Brand Logo */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-dineconnect.png"
                alt="DineConnect logo"
                className="w-9 h-9 rounded-xl object-contain"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tight">
                  <span className="text-white">Dine</span>
                  <span className="text-[#e8603c]">Connect</span>
                </span>
                <span className="text-[10px] text-white/40 tracking-wider font-medium mt-0.5">
                  OPERATIONS DESK
                </span>
              </div>
            </div>

            {user?.role === 'superadmin' && (
              <Link
                href="/admin"
                className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg transition flex items-center gap-1"
                title="Go to SaaS Owner Dashboard"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Section Header */}
          <div className="px-6 mt-4 mb-2 text-[10px] tracking-widest text-white/40 font-semibold uppercase shrink-0">
            Operations
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-sm shadow-teal-900/30 font-semibold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-bold bg-[#e8603c] text-white px-2 py-0.5 rounded-full shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3.5 space-y-2.5 shrink-0 bg-[#0c1c17] border-t border-white/5">
          {/* WhatsApp Bridge Card */}
          <div
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 transition cursor-pointer rounded-2xl p-3 border border-white/5 group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isBridgeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs text-white/80 font-medium">WhatsApp Bridge</span>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                  isBridgeConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isBridgeConnected ? 'ONLINE' : 'SETUP'}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-lg font-black text-white">{activeConversations}</div>
                <div className="text-[10px] text-white/40">active chats</div>
              </div>
              <span className="text-[11px] font-bold text-[#e8603c] group-hover:underline flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>{isBridgeConnected ? 'QR Settings' : 'Connect QR'}</span>
              </span>
            </div>
          </div>

          {/* Restaurant Switcher or Active Restaurant Badge */}
          {user?.role === 'superadmin' ? (
            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-[#e8603c] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentRestaurant?.name ? currentRestaurant.name.slice(0, 2).toUpperCase() : 'TB'}
                  </div>
                  <div className="leading-tight overflow-hidden">
                    <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
                      Active Restaurant
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {currentRestaurant?.name || 'Select Restaurant'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
              </button>

              {isSwitcherOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#12211d] border border-white/10 rounded-2xl shadow-xl overflow-hidden py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5">
                    Switch Restaurant
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                    {restaurants.map((r) => {
                      const isSelected = r.id === currentRestaurantId;
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setCurrentRestaurantId(r.id);
                            setIsSwitcherOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-white/5 transition text-left ${
                            isSelected ? 'text-emerald-400 font-bold' : 'text-white/80'
                          }`}
                        >
                          <span className="truncate">{r.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-1 border-t border-white/5">
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsAddRestaurantModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#e8603c] hover:bg-[#e8603c]/10 rounded-xl transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Restaurant</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-[#e8603c] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentRestaurant?.name ? currentRestaurant.name.slice(0, 2).toUpperCase() : 'DC'}
              </div>
              <div className="leading-tight overflow-hidden">
                <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
                  Restaurant Desk
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {currentRestaurant?.name || 'My Restaurant'}
                </div>
              </div>
            </div>
          )}

          {/* User profile & Logout */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between px-1">
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-white truncate">
                {user?.name || user?.username || 'Logged In'}
              </span>
              <span className="text-[10px] text-white/40 capitalize">
                {user?.role === 'superadmin' ? 'Superadmin' : 'Restaurant Owner'}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/60 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onStatusChange={fetchStatus}
      />

      <AddRestaurantModal
        isOpen={isAddRestaurantModalOpen}
        onClose={() => setIsAddRestaurantModalOpen(false)}
        onCreated={(id) => {
          setCurrentRestaurantId(id);
        }}
      />
    </>
  );
}
