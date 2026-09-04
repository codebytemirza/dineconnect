'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Clock,
  MapPin,
  User,
  X,
  ChevronRight,
  Filter,
  CheckCircle2,
  BellRing,
  CreditCard,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/queries';
import { useRestaurant } from '@/context/restaurant-context';

export default function OrdersPage() {
  const { currentRestaurant, currentRestaurantId } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  async function loadOrders() {
    if (!currentRestaurantId) return;
    try {
      const res = await fetch(`/api/orders?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [currentRestaurantId]);

  async function handleStatusUpdate(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }

        const customerPhone = json.data?.customer_phone || 'customer';
        setNotificationToast(`Order #${orderId} status changed to ${newStatus}. Automated WhatsApp message sent to ${customerPhone}!`);
        setTimeout(() => setNotificationToast(null), 5000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  const currencySymbol = currentRestaurant?.currency || 'PKR';

  // Filter & Search Logic
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = activeFilter === 'all' || order.status === activeFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer_phone && order.customer_phone.includes(searchQuery)) ||
      (order.delivery_address && order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.payment_method && order.payment_method.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const statusColors: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    preparing: { bg: 'bg-orange-50', text: 'text-[#e8603c]', dot: 'bg-[#e8603c]' },
    completed: { bg: 'bg-teal-50', text: 'text-[#0f766e]', dot: 'bg-[#0f766e]' },
    cancelled: { bg: 'bg-stone-100', text: 'text-stone-500', dot: 'bg-stone-400' },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Automated WhatsApp Notification Alert Toast */}
      {notificationToast && (
        <div className="fixed top-5 right-6 z-50 bg-[#0f766e] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-3 border border-teal-400/30 animate-in fade-in slide-in-from-top-4 duration-200">
          <BellRing className="w-4 h-4 text-emerald-300 animate-bounce" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Fixed Top Header */}
      <div className="px-8 pt-6 pb-4 border-b border-[#12211d]/5 bg-[#f7f5f0] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#12211d]/60 font-medium mb-0.5">
              <span className="font-bold text-[#12211d]">{currentRestaurant?.name || 'Restaurant'}</span>
              <span className="mx-2 text-[#12211d]/30">/</span>
              <span>Orders Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12211d] tracking-tight">
              Orders Management
            </h1>
          </div>

          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/10 text-[#12211d] px-3.5 py-2 rounded-xl text-xs font-semibold card-shadow transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#12211d]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, phone, payment method, or ID..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-[#12211d]/10 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'pending', label: 'Pending', count: counts.pending },
              { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
              { id: 'preparing', label: 'Preparing', count: counts.preparing },
              { id: 'completed', label: 'Completed', count: counts.completed },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-sm'
                      : 'bg-white text-[#12211d]/70 hover:bg-stone-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#12211d]/60'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contained Scrollable Orders Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="bg-white rounded-2xl card-shadow border border-[#12211d]/5 overflow-hidden">
          {!currentRestaurantId ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto text-[#12211d]/20 mb-3" />
              <div className="font-bold text-[#12211d]/70 text-base">No Restaurant Selected</div>
              <div className="text-xs text-[#12211d]/40 mt-1 max-w-sm mx-auto">
                Please create or select a restaurant from the sidebar to view orders.
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-[#12211d]/40 font-medium text-sm">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto text-[#12211d]/20 mb-3" />
              <div className="font-bold text-[#12211d]/70 text-base">No orders found</div>
              <div className="text-xs text-[#12211d]/40 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No orders match your search criteria.'
                  : 'Orders placed via WhatsApp will appear here automatically.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/80 border-b border-[#12211d]/5 text-[11px] font-bold text-[#12211d]/50 uppercase tracking-wider sticky top-0 bg-stone-50 z-10">
                  <tr>
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Items Summary</th>
                    <th className="px-6 py-3.5">Payment</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12211d]/5 font-medium">
                  {filteredOrders.map((order) => {
                    const style = statusColors[order.status] || statusColors.pending;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-stone-50/70 transition-colors group"
                      >
                        {/* Order ID */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="font-bold text-[#0f766e] hover:underline"
                          >
                            #{order.id.slice(-6)}
                          </button>
                        </td>

                        {/* Customer Info */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#12211d]">
                            {order.customer_name || 'WhatsApp Customer'}
                          </div>
                          <div className="text-xs text-[#12211d]/40 mt-0.5 font-mono">
                            {order.customer_phone}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-xs text-[#12211d]/70 truncate">
                            {order.items && order.items.length > 0
                              ? order.items
                                  .map((it) => `${it.quantity}x ${it.item_name}`)
                                  .join(', ')
                              : 'No items'}
                          </div>
                          {order.delivery_address && (
                            <div className="text-[11px] text-[#12211d]/40 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 shrink-0 text-[#12211d]/30" />
                              <span className="truncate">{order.delivery_address}</span>
                            </div>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.payment_method === 'Online Payment'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {order.payment_method || 'Cash on Delivery'}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4">
                          <span className="font-black text-[#12211d]">
                            {currencySymbol} {order.total_amount.toFixed(2)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span className="capitalize">{order.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={order.status}
                              disabled={updatingId === order.id}
                              onChange={(e) =>
                                handleStatusUpdate(order.id, e.target.value as OrderStatus)
                              }
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-[#12211d]/15 bg-white text-[#12211d] cursor-pointer focus:ring-2 focus:ring-[#0f766e]"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="preparing">Preparing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#0f766e] hover:bg-[#0f766e]/10 rounded-lg transition"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 card-shadow border border-[#12211d]/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#12211d]/10 pb-4">
              <div>
                <span className="text-xs font-bold text-[#0f766e] uppercase tracking-wider">
                  Order Breakdown
                </span>
                <h3 className="text-xl font-black text-[#12211d]">
                  #{selectedOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer, Address & Payment Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-[#12211d]/5">
              <div>
                <div className="text-[#12211d]/40 font-medium mb-0.5">Customer</div>
                <div className="font-bold text-[#12211d]">
                  {selectedOrder.customer_name || 'Customer'}
                </div>
                <div className="text-[#12211d]/60 font-mono text-[11px] truncate">{selectedOrder.customer_phone}</div>
              </div>
              <div>
                <div className="text-[#12211d]/40 font-medium mb-0.5">Delivery Address</div>
                <div className="font-bold text-[#12211d] truncate">
                  {selectedOrder.delivery_address || 'Pickup'}
                </div>
              </div>
              <div>
                <div className="text-[#12211d]/40 font-medium mb-0.5">Payment Method</div>
                <div className="font-bold text-teal-700">
                  {selectedOrder.payment_method || 'Cash on Delivery'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-[#12211d]/50 uppercase tracking-wider">
                Line Items
              </div>
              <div className="divide-y divide-[#12211d]/5 border-t border-b border-[#12211d]/5 max-h-48 overflow-y-auto">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#12211d]">
                        {item.quantity}x {item.item_name}
                      </span>
                      {item.customizations && (
                        <p className="text-[11px] text-[#e8603c] italic mt-0.5">
                          Note: {item.customizations}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-[#12211d]">
                      {currencySymbol} {item.total_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-[#12211d]">Grand Total</span>
              <span className="text-2xl font-black text-[#12211d]">
                {currencySymbol} {selectedOrder.total_amount.toFixed(2)}
              </span>
            </div>

            <div className="pt-3 border-t border-[#12211d]/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#12211d]/60">Change Status:</span>
                <div className="flex items-center gap-1.5">
                  {(['pending', 'confirmed', 'preparing', 'completed', 'cancelled'] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        disabled={updatingId === selectedOrder.id}
                        onClick={() => handleStatusUpdate(selectedOrder.id, st)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize transition ${
                          selectedOrder.status === st
                            ? 'bg-[#0f766e] text-white shadow-sm'
                            : 'bg-stone-100 text-[#12211d]/70 hover:bg-stone-200'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#0f766e] italic text-right">
                ⚡ Updating status sends an automated WhatsApp message to the customer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
