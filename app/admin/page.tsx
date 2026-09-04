'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Store,
  Plus,
  Trash2,
  QrCode,
  DollarSign,
  Receipt,
  Users,
  ExternalLink,
  RefreshCw,
  LogOut,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';

interface AdminRestaurant {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  is_active: number;
  created_at: string;
  users: Array<{ id: string; username: string; name: string }>;
  stats: {
    ordersToday: number;
    revenueToday: number;
    activeConversations: number;
  };
  whatsapp: {
    status: string;
    connectedPhone: string | null;
  };
  subscription?: {
    status: 'paid' | 'due' | 'overdue' | 'suspended';
    dueDate: string;
    daysRemaining: number;
    daysOverdue: number;
    isSuspended: boolean;
    monthlyRate: number;
    lastPaymentDate: string | null;
    reminderNotice: string | null;
  };
}

interface SaasStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  totalRestaurants: number;
  paidCount: number;
  dueCount: number;
  overdueCount: number;
  suspendedCount: number;
}

async function readJsonResponse<T>(response: Response, requestName: string): Promise<T> {
  const responseText = await response.text();
  if (!responseText) {
    throw new Error(`${requestName} returned an empty response (${response.status}).`);
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`${requestName} returned an invalid response (${response.status}).`);
  }
}

export default function SaaSAdminPage() {
  const router = useRouter();
  const { user, userLoading, logout, setCurrentRestaurantId } = useRestaurant();

  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [saasStats, setSaasStats] = useState<SaasStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<AdminRestaurant | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  // Form State for creating restaurant + credentials
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('PKR');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formManagerName, setFormManagerName] = useState<string>('');
  const [formIsPaymentDone, setFormIsPaymentDone] = useState<boolean>(true);
  const [formPaymentDate, setFormPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formPaymentAmount, setFormPaymentAmount] = useState<number>(5000);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Renewal Payment Modal State
  const [paymentModalRestaurant, setPaymentModalRestaurant] = useState<AdminRestaurant | null>(null);
  const [renewalDate, setRenewalDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [renewalAmount, setRenewalAmount] = useState<number>(5000);
  const [renewalNotes, setRenewalNotes] = useState<string>('Monthly subscription renewed');

  // Protection: must be superadmin
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [user, userLoading, router]);

  async function loadAdminData() {
    try {
      setLoading(true);

      // Fetch enriched restaurants
      const [res, subRes] = await Promise.all([
        fetch('/api/admin/restaurants'),
        fetch('/api/admin/subscriptions'),
      ]);
      const [json, subJson] = await Promise.all([
        readJsonResponse<{ success?: boolean; error?: string; data?: AdminRestaurant[] }>(res, 'Restaurant data request'),
        readJsonResponse<{
          success?: boolean;
          error?: string;
          data?: { stats?: SaasStats; restaurants?: Array<{ id: string; subscription: AdminRestaurant['subscription'] }> };
        }>(subRes, 'Subscription data request'),
      ]);

      if (!res.ok) throw new Error(json.error || `Restaurant data request failed (${res.status}).`);
      if (!subRes.ok) throw new Error(subJson.error || `Subscription data request failed (${subRes.status}).`);

      if (json.success && Array.isArray(json.data)) {
        let merged = json.data;
        if (subJson.success && subJson.data?.restaurants) {
          const subMap = new Map<string, any>(
            subJson.data.restaurants.map((r: any) => [r.id, r.subscription])
          );
          merged = merged.map((r: AdminRestaurant) => ({
            ...r,
            subscription: subMap.get(r.id),
          }));
        }
        setRestaurants(merged);
      }

      if (subJson.success && subJson.data?.stats) {
        setSaasStats(subJson.data.stats);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadAdminData();
    }
  }, [user]);

  async function handleRecordPayment(
    restaurantId: string,
    restaurantName: string,
    customDate?: string,
    customAmount?: number,
    customNotes?: string
  ) {
    setProcessingPaymentId(restaurantId);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          amount: customAmount || 5000,
          paymentDate: customDate,
          notes: customNotes || `PKR ${(customAmount || 5000).toLocaleString()} Subscription Renewal received by SaaS Owner`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionNotice(`Payment recorded for "${restaurantName}"! 30 days added & account active.`);
        setTimeout(() => setActionNotice(null), 5000);
        setPaymentModalRestaurant(null);
        loadAdminData();
      } else {
        alert(json.error || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleToggleSuspension(restaurantId: string, currentSuspended: boolean, name: string) {
    const nextSuspended = !currentSuspended;
    const confirmMsg = nextSuspended
      ? `Suspend "${name}"? This will close their session and disconnect their WhatsApp bot immediately.`
      : `Unsuspend "${name}" and restore their dashboard session?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          suspend: nextSuspended,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionNotice(json.message);
        setTimeout(() => setActionNotice(null), 5000);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating suspension');
    }
  }

  async function handleCreateRestaurant(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formUsername || !formPassword) {
      setFormError('Please fill in restaurant name, login username, and password.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          address: formAddress,
          currency: formCurrency,
          username: formUsername,
          password: formPassword,
          managerName: formManagerName,
          isPaymentDone: formIsPaymentDone,
          paymentDate: formPaymentDate,
          paymentAmount: formPaymentAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || 'Failed to create restaurant');
        return;
      }

      setActionNotice(`Restaurant "${formName}" created with ${formIsPaymentDone ? 'Payment Done (PKR 5,000)' : 'Trial Mode'}! Login: "${formUsername}"`);
      setTimeout(() => setActionNotice(null), 5000);

      setShowCreateModal(false);
      setFormName('');
      setFormPhone('');
      setFormAddress('');
      setFormUsername('');
      setFormPassword('');
      setFormManagerName('');
      setFormIsPaymentDone(true);
      setFormPaymentDate(new Date().toISOString().split('T')[0]);
      setFormPaymentAmount(5000);
      loadAdminData();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while creating restaurant.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleWipeRestaurant() {
    if (!restaurantToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantToDelete.id}`, {
        method: 'DELETE',
      });
      const responseText = await res.text();
      let json: { success?: boolean; error?: string } | null = null;

      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(`The wipe request returned an invalid response (${res.status}).`);
      }

      if (res.ok && json?.success) {
        setActionNotice(`Restaurant "${restaurantToDelete.name}" and all associated data wiped completely.`);
        setTimeout(() => setActionNotice(null), 5000);
        setRestaurantToDelete(null);
        loadAdminData();
      } else {
        alert(json?.error || `Failed to delete restaurant (${res.status}).`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to wipe restaurant.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (userLoading || (user && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a1411] text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-xs font-semibold text-white/60">Verifying Superadmin Access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a1411] text-white flex flex-col selection:bg-[#e8603c]">
      {/* Top SaaS Header */}
      <header className="px-6 sm:px-12 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#0a1411]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#e8603c] to-orange-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-orange-500/20">
            D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg tracking-tight text-white">
                DineConnect <span className="text-[#e8603c]">SaaS Owner Console</span>
              </h1>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>SUPERADMIN</span>
              </span>
            </div>
            <p className="text-[11px] text-white/40">
              Subscription Billing, Revenue Tracking & Multi-Tenant Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition border border-white/5"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Restaurant</span>
          </button>

          <button
            onClick={logout}
            className="bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 p-2.5 rounded-xl transition border border-white/5"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2.5 text-center flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-12 max-w-7xl w-full mx-auto space-y-8">
        {/* SAAS REVENUE & SUBSCRIPTION METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total SaaS Revenue */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3 text-xs font-bold uppercase tracking-wider">
              <span>Total SaaS Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                PKR {(saasStats?.totalRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
                Collected subscription fees
              </div>
            </div>
          </div>

          {/* Monthly Recurring Revenue */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3 text-xs font-bold uppercase tracking-wider">
              <span>Monthly Recurring (MRR)</span>
              <CreditCard className="w-4 h-4 text-[#e8603c]" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                PKR {(saasStats?.monthlyRecurringRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-white/40 mt-1">PKR 5,000 / restaurant / mo</div>
            </div>
          </div>

          {/* Paid vs Due Status */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3 text-xs font-bold uppercase tracking-wider">
              <span>Subscription Health</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">
                {saasStats?.paidCount ?? 0} Paid · {saasStats?.dueCount ?? 0} Due Soon
              </div>
              <div className="text-[11px] text-white/40 mt-1">
                {saasStats?.suspendedCount ?? 0} Suspended (&gt;2 days overdue)
              </div>
            </div>
          </div>

          {/* Connected WhatsApp Bridges */}
          <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3 text-xs font-bold uppercase tracking-wider">
              <span>Active WhatsApp Bridges</span>
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">
                {restaurants.filter((r) => r.whatsapp?.status === 'connected').length} / {restaurants.length}
              </div>
              <div className="text-[11px] text-white/40 mt-1">Live client sockets</div>
            </div>
          </div>
        </div>

        {/* Restaurants Directory with Payment Status */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                All Restaurants & Billing Status
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Restaurants receive reminder toasts 2 days before due date. If unpaid 2 days after due date, their session &amp; bot are automatically suspended.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-white/40 text-xs">
              Loading platform restaurants &amp; subscription records...
            </div>
          ) : restaurants.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-12 text-center space-y-4">
              <Store className="w-12 h-12 text-white/20 mx-auto" />
              <div className="text-sm font-bold text-white/70">No restaurants registered yet</div>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Click "Onboard Restaurant" above to create your first client restaurant along with its login credentials.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard Restaurant Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {restaurants.map((rest) => {
                const sub = rest.subscription;
                const isWaConnected = rest.whatsapp?.status === 'connected';
                const manager = rest.users?.[0];
                const isSuspended = sub?.isSuspended;

                return (
                  <div
                    key={rest.id}
                    className={`bg-white/[0.03] border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition ${
                      isSuspended
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : sub?.status === 'due'
                        ? 'border-amber-500/40'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Title & Subscription Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-white">{rest.name}</h3>
                            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/50">
                              {rest.currency}
                            </span>
                          </div>
                          <div className="text-xs text-white/40 mt-0.5 font-mono">{rest.id}</div>
                        </div>

                        {/* Subscription Pill */}
                        {isSuspended ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>SUSPENDED</span>
                          </span>
                        ) : sub?.status === 'due' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>DUE IN {sub.daysRemaining}D</span>
                          </span>
                        ) : sub?.status === 'overdue' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>OVERDUE {sub.daysOverdue}D</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        )}
                      </div>

                      {/* Billing Due Date & Rate Box */}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/50">Monthly Plan:</span>
                          <span className="font-bold text-white">PKR {(sub?.monthlyRate || 5000).toLocaleString()} / mo</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/50">Billing Due Date:</span>
                          <span className="font-mono font-semibold text-white/90">
                            {sub?.dueDate ? new Date(sub.dueDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/50">WhatsApp Bot Status:</span>
                          <span className={`font-semibold ${isWaConnected ? 'text-emerald-400' : 'text-stone-400'}`}>
                            {isSuspended ? '🔒 Locked (Payment Due)' : isWaConnected ? '🟢 Connected' : '⚪ Disconnected'}
                          </span>
                        </div>
                      </div>

                      {/* Manager Login Info */}
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-xs flex items-center justify-between">
                        <span className="text-white/50">Login:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {manager?.username || 'No login'}
                        </span>
                      </div>
                    </div>

                    {/* Subscription Controls & Actions */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Mark Paid (+30 Days) Button */}
                        <button
                          disabled={processingPaymentId === rest.id}
                          onClick={() => {
                            setPaymentModalRestaurant(rest);
                            setRenewalDate(new Date().toISOString().split('T')[0]);
                            setRenewalAmount(rest.subscription?.monthlyRate || 5000);
                            setRenewalNotes('Monthly subscription renewal');
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Mark as Paid (+30D)</span>
                        </button>

                        {/* Manual Lock/Unlock Suspension */}
                        <button
                          onClick={() => handleToggleSuspension(rest.id, !!isSuspended, rest.name)}
                          className={`p-2 rounded-xl border text-xs transition ${
                            isSuspended
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title={isSuspended ? 'Unlock Session' : 'Manually Suspend Session'}
                        >
                          {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          onClick={() => {
                            setCurrentRestaurantId(rest.id);
                            router.push('/dashboard');
                          }}
                          className="text-white/70 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3 text-[#0f766e]" />
                          <span>View Desk</span>
                        </button>

                        <button
                          onClick={() => setRestaurantToDelete(rest)}
                          className="text-rose-400 hover:text-rose-200 text-[11px] flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Wipe All</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Onboard New Restaurant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12211d] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Onboard New Restaurant</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Creates restaurant profile &amp; dedicated login credentials.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRestaurant} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-white/70">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Spice Grill, Karachi Pizza"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-white/70">Contact Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 328 4119134"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-white/70">Currency</label>
                  <input
                    type="text"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    placeholder="PKR"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white/70">Address / City</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. MM Alam Road, Gulberg, Lahore"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Restaurant Manager Credentials
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-white/70">Login Username *</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. spicegrill"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white/70">Login Password *</label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SAAS SUBSCRIPTION PAYMENT ON ONBOARDING */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>SaaS Subscription Payment</span>
                  </span>
                  <span className="text-[10px] text-white/40">PKR 5,000 / month flat</span>
                </div>

                {/* Payment Status Choice */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormIsPaymentDone(true)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      formIsPaymentDone
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Payment Done (Paid)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormIsPaymentDone(false)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      !formIsPaymentDone
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Trial / Payment Pending</span>
                  </button>
                </div>

                {/* Date Picker & Amount when Payment Done is selected */}
                {formIsPaymentDone && (
                  <div className="grid grid-cols-2 gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/10 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="font-semibold text-white/80 text-[11px] flex items-center gap-1">
                        <span>Payment Done Date *</span>
                        <span className="text-emerald-400 text-[10px]">(Auto-picked)</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formPaymentDate}
                        onChange={(e) => setFormPaymentDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-white/80 text-[11px]">
                        Payment Amount (PKR)
                      </label>
                      <input
                        type="number"
                        value={formPaymentAmount}
                        onChange={(e) => setFormPaymentAmount(Number(e.target.value))}
                        placeholder="5000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-2 text-[10.5px] text-emerald-300/90 flex items-center gap-1.5 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Starts 30-day active period. Next billing due:{' '}
                        <strong>
                          {new Date(new Date(formPaymentDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating Restaurant...' : 'Create & Generate Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Renewal Payment Modal with Date Picker */}
      {paymentModalRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#12211d] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Record Subscription Payment</h3>
                  <p className="text-[11px] text-white/50">{paymentModalRestaurant.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalRestaurant(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-white/80 text-[11px] flex items-center justify-between">
                  <span>Payment Date *</span>
                  <span className="text-emerald-400 text-[10px]">(Today auto-selected)</span>
                </label>
                <input
                  type="date"
                  required
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white/80 text-[11px]">
                  Payment Amount (PKR)
                </label>
                <input
                  type="number"
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(Number(e.target.value))}
                  placeholder="5000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white/80 text-[11px]">Payment Notes</label>
                <input
                  type="text"
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  placeholder="e.g. Bank transfer receipt #84930"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[11px] text-emerald-300/90 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Extends subscription by 30 days. New due date:{' '}
                  <strong>{new Date(new Date(renewalDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalRestaurant(null)}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingPaymentId === paymentModalRestaurant.id}
                onClick={() =>
                  handleRecordPayment(
                    paymentModalRestaurant.id,
                    paymentModalRestaurant.name,
                    renewalDate,
                    renewalAmount
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-md text-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>
                  {processingPaymentId === paymentModalRestaurant.id ? 'Recording...' : 'Confirm & Mark Paid (+30D)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Complete Wipe */}
      {restaurantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#181113] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-rose-500/20 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">
                Wipe Restaurant &amp; All Data?
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                You are about to permanently wipe <strong>"{restaurantToDelete.name}"</strong>. This will erase its WhatsApp session, menu items, orders, and login account.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setRestaurantToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleWipeRestaurant}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-rose-900/40 disabled:opacity-50"
              >
                {isDeleting ? 'Wiping All Data...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
