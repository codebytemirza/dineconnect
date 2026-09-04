'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  DollarSign,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Lock,
  Clock,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import type { DashboardStats, OrderStatus } from '@/lib/queries';
import { useRestaurant } from '@/context/restaurant-context';
import { WhatsAppModal } from '@/components/whatsapp-modal';
import { AddRestaurantModal } from '@/components/add-restaurant-modal';

export default function DashboardOverviewPage() {
  const router = useRouter();
  const {
    restaurants,
    currentRestaurant,
    currentRestaurantId,
    setCurrentRestaurantId,
    user,
    userLoading,
  } = useRestaurant();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isAddRestaurantModalOpen, setIsAddRestaurantModalOpen] = useState<boolean>(false);
  const [formattedDate, setFormattedDate] = useState<string>('TODAY');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    status: 'paid' | 'due' | 'overdue' | 'suspended';
    dueDate: string;
    daysRemaining: number;
    daysOverdue: number;
    isSuspended: boolean;
    monthlyRate: number;
    reminderNotice: string | null;
  } | null>(null);

  // Authentication protection
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const now = new Date();
    setFormattedDate(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).toUpperCase()
    );
  }, []);

  async function loadData() {
    if (!currentRestaurantId) {
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/stats?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }

      const bridgeRes = await fetch(`/api/whatsapp/status?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const bridgeJson = await bridgeRes.json();
      if (bridgeJson.success && bridgeJson.data) {
        setBridgeStatus(bridgeJson.data.status);
        setConnectedPhone(bridgeJson.data.connectedPhone || null);
      }

      const subRes = await fetch(`/api/restaurant/subscription?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const subJson = await subRes.json();
      if (subJson.success && subJson.data) {
        setSubscription(subJson.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [currentRestaurantId]);

  async function handleQuickStatusChange(orderId: string, nextStatus: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusToast(`Order #${orderId} updated to ${nextStatus}. WhatsApp notification sent!`);
        setTimeout(() => setStatusToast(null), 4000);
        loadData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const currency = stats?.currency || currentRestaurant?.currency || 'PKR';
  const isBridgeConnected = bridgeStatus === 'connected';

  if (userLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f7f5f0]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0f766e]" />
          <span className="text-xs font-semibold">Verifying secure session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* 2-Day Reminder Banner before Due Date */}
      {subscription?.status === 'due' && !subscription?.isSuspended && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-950 px-8 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-medium shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
            <span>{subscription.reminderNotice}</span>
          </div>
          <a
            href="https://wa.me/923284119134?text=Hi%2C%20I%20am%20settling%20my%20DineConnect%20subscription%20payment%20(PKR%205000)"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] shrink-0 text-center"
          >
            Renew Now (PKR 5,000)
          </a>
        </div>
      )}

      {/* Overdue Grace Period Alert Banner */}
      {subscription?.status === 'overdue' && !subscription?.isSuspended && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-950 px-8 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-medium shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>{subscription.reminderNotice}</span>
          </div>
          <a
            href="https://wa.me/923284119134?text=Hi%2C%20I%20am%20settling%20my%20overdue%20DineConnect%20subscription%20payment"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] shrink-0 text-center"
          >
            Pay Now to Avoid Bot Shutdown
          </a>
        </div>
      )}

      {/* AUTOMATIC SESSION SUSPENSION OVERLAY (>2 Days Out of Date) */}
      {subscription?.isSuspended && (
        <div className="fixed inset-0 z-50 bg-[#0a1411]/95 backdrop-blur-md flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md w-full bg-[#12211d] rounded-3xl p-8 border border-rose-500/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                Restaurant Session &amp; WhatsApp Bot Suspended
              </h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Payment is more than <strong>2 days out of date</strong> (overdue by {subscription.daysOverdue} days). Your dashboard session and WhatsApp ordering bot have been automatically closed.
              </p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl text-xs space-y-1.5 border border-white/5 text-left">
              <div className="flex justify-between">
                <span className="text-white/50">Subscription Fee:</span>
                <span className="font-bold text-white">PKR {(subscription.monthlyRate || 5000).toLocaleString()} / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Billing Due Date:</span>
                <span className="font-mono text-rose-300 font-bold">{new Date(subscription.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Service Status:</span>
                <span className="text-rose-400 font-bold">Locked / Disconnected</span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <a
                href="https://wa.me/923284119134?text=Hi%2C%20I%20want%20to%20settle%20my%20DineConnect%20subscription%20payment%20and%20reactivate%20my%20session"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Contact SaaS Owner (+92 328 4119134) to Reactivate</span>
              </a>

              <button
                onClick={loadData}
                className="w-full bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl text-xs font-semibold transition"
              >
                Check Payment &amp; Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {statusToast && (
        <div className="fixed top-5 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Sticky Header */}
      <div className="px-8 pt-6 pb-4 border-b border-[#12211d]/5 bg-[#f7f5f0] shrink-0 space-y-3">
        {user?.role === 'superadmin' && (
          <div className="bg-emerald-950/10 border border-emerald-600/20 text-emerald-900 px-4 py-2 rounded-xl text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>You are logged in as <strong>SaaS Owner (Superadmin)</strong>. You have full platform access.</span>
            </div>
            <Link
              href="/admin"
              className="font-bold text-emerald-800 underline hover:text-emerald-950"
            >
              Go to SaaS Owner Dashboard →
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#12211d]/60 font-semibold tracking-wider mb-0.5">
              {formattedDate} • {currentRestaurant?.name || 'Restaurant Dashboard'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12211d] tracking-tight">
              Live Operations Desk
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/10 text-[#12211d] px-3 py-2 rounded-xl text-xs font-semibold card-shadow transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                isBridgeConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#e8603c] hover:bg-[#d45331] text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isBridgeConnected ? 'WhatsApp Connected' : 'Connect WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* KPI Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orders Today */}
          <div className="bg-white rounded-2xl p-5 card-shadow border border-[#12211d]/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#12211d]/50 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Orders Today</span>
              <Receipt className="w-4 h-4 text-[#0f766e]" />
            </div>
            <div>
              <div className="text-3xl font-black text-[#12211d]">
                {stats?.ordersToday ?? 0}
              </div>
              <div className="text-[11px] text-[#12211d]/50 mt-1">Autonomous WhatsApp bookings</div>
            </div>
          </div>

          {/* Revenue Today */}
          <div className="bg-white rounded-2xl p-5 card-shadow border border-[#12211d]/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#12211d]/50 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Revenue Today</span>
              <DollarSign className="w-4 h-4 text-[#e8603c]" />
            </div>
            <div>
              <div className="text-3xl font-black text-[#12211d]">
                {currency} {(stats?.revenueToday ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#12211d]/50 mt-1">Gross confirmed bookings</div>
            </div>
          </div>

          {/* Average Order */}
          <div className="bg-white rounded-2xl p-5 card-shadow border border-[#12211d]/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#12211d]/50 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Average Ticket</span>
              <TrendingUp className="w-4 h-4 text-[#0f766e]" />
            </div>
            <div>
              <div className="text-3xl font-black text-[#12211d]">
                {currency} {(stats?.averageOrder ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#12211d]/50 mt-1">Per confirmed order</div>
            </div>
          </div>

          {/* Active WhatsApp Chats */}
          <div className="bg-white rounded-2xl p-5 card-shadow border border-[#12211d]/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#12211d]/50 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Active Conversations</span>
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-[#12211d]">
                {stats?.activeConversations ?? 0}
              </div>
              <div className="text-[11px] text-[#12211d]/50 mt-1">WhatsApp chats in last 24h</div>
            </div>
          </div>
        </div>

        {/* Live Service Flow (Status Pipeline) */}
        <div className="bg-white rounded-2xl p-6 card-shadow border border-[#12211d]/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#12211d]">Live Order Flow Pipeline</h2>
              <p className="text-xs text-[#12211d]/50 mt-0.5">
                Orders move automatically from WhatsApp intake to Kitchen preparation
              </p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold text-[#0f766e] hover:underline flex items-center gap-1"
            >
              <span>View Full Orders Desk</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { status: 'pending', label: 'Pending', count: stats?.liveFlow.pending ?? 0, color: 'amber' },
              { status: 'confirmed', label: 'Confirmed', count: stats?.liveFlow.confirmed ?? 0, color: 'blue' },
              { status: 'preparing', label: 'Preparing', count: stats?.liveFlow.preparing ?? 0, color: 'orange' },
              { status: 'completed', label: 'Completed', count: stats?.liveFlow.completed ?? 0, color: 'teal' },
              { status: 'cancelled', label: 'Cancelled', count: stats?.liveFlow.cancelled ?? 0, color: 'stone' },
            ].map((f) => (
              <div
                key={f.status}
                className="p-3.5 rounded-xl border border-[#12211d]/5 bg-stone-50/60 flex flex-col justify-between"
              >
                <div className="text-xs font-bold text-[#12211d]/60 uppercase tracking-wider mb-1">
                  {f.label}
                </div>
                <div className="text-2xl font-black text-[#12211d]">{f.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders & Quick Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 card-shadow border border-[#12211d]/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#12211d]">Recent Kitchen Orders</h2>
                <p className="text-xs text-[#12211d]/50 mt-0.5">
                  Change status below to automatically notify the customer on WhatsApp
                </p>
              </div>
              <Link
                href="/orders"
                className="text-xs font-bold text-[#0f766e] hover:underline"
              >
                See All
              </Link>
            </div>

            {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
              <div className="py-12 text-center text-[#12211d]/40 text-xs">
                No orders received yet today. Once customers chat on WhatsApp, orders appear here!
              </div>
            ) : (
              <div className="divide-y divide-[#12211d]/5 overflow-x-auto">
                {stats.recentOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#12211d]">#{order.id}</span>
                        <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                          {order.payment_method || 'Cash on Delivery'}
                        </span>
                      </div>
                      <div className="text-[#12211d]/60 mt-0.5">
                        {order.customer_name || 'WhatsApp Customer'} • {order.customer_phone}
                      </div>
                      <div className="text-[11px] text-[#12211d]/40 mt-0.5 truncate max-w-xs">
                        {order.delivery_address || 'Pickup'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-black text-sm text-[#12211d]">
                        {currency} {order.total_amount.toFixed(2)}
                      </span>

                      <select
                        disabled={updatingOrderId === order.id}
                        value={order.status}
                        onChange={(e) => handleQuickStatusChange(order.id, e.target.value as OrderStatus)}
                        className="text-xs bg-stone-100 font-bold border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Management & Knowledge Base Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#0f231d] to-[#16362d] text-white rounded-2xl p-6 card-shadow space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase text-white/70">
                  AI WhatsApp Bot Live
                </span>
              </div>

              <h3 className="text-lg font-black leading-snug">
                Automate Your Restaurant Orders on WhatsApp
              </h3>

              <p className="text-xs text-white/70 leading-relaxed">
                Your AI agent answers customer menus, collects language preferences, offers Cash on Delivery & Online Bank payments, and books orders directly into this dashboard.
              </p>

              <div className="pt-2 space-y-2">
                <Link
                  href="/knowledge-base"
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 text-white rounded-xl p-3 text-xs font-bold transition"
                >
                  <span>Manage Knowledge Base</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/menu"
                  className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 text-white rounded-xl p-3 text-xs font-bold transition"
                >
                  <span>Manage Menu & Custom Categories</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* WhatsApp Connection Health Card */}
            <div className="bg-white rounded-2xl p-6 card-shadow border border-[#12211d]/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#12211d]/50 uppercase tracking-wider">
                  WhatsApp Connection
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isBridgeConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isBridgeConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <p className="text-xs text-[#12211d]/60 leading-relaxed">
                {isBridgeConnected
                  ? `Active number: +${(connectedPhone || '').replace(/[^0-9]/g, '')}. The bot is actively taking customer orders.`
                  : 'Scan the WhatsApp QR code to link your business phone number and start receiving automated orders.'}
              </p>

              <button
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d5f58] text-white rounded-xl py-2.5 text-xs font-bold transition shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{isBridgeConnected ? 'Manage WhatsApp Bridge' : 'Connect WhatsApp QR'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp QR Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onStatusChange={loadData}
      />

      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        isOpen={isAddRestaurantModalOpen}
        onClose={() => setIsAddRestaurantModalOpen(false)}
        onCreated={(id) => {
          setCurrentRestaurantId(id);
          loadData();
        }}
      />
    </div>
  );
}
