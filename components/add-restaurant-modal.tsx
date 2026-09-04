'use client';

import React, { useState } from 'react';
import { X, Store, DollarSign, Phone, MapPin } from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (restaurantId: string) => void;
}

export function AddRestaurantModal({ isOpen, onClose, onCreated }: AddRestaurantModalProps) {
  const { createRestaurant } = useRestaurant();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const created = await createRestaurant({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        currency: currency.trim() || 'PKR',
      });

      if (created) {
        setName('');
        setPhone('');
        setAddress('');
        setCurrency('PKR');
        onCreated?.(created.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create restaurant:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 card-shadow border border-[#12211d]/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#12211d]/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#12211d]">Add New Restaurant</h3>
              <p className="text-xs text-[#12211d]/50">Create an isolated restaurant branch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-[#12211d]/70 mb-1">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bella Italia Trattoria"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#12211d]/70 mb-1">
                Currency Symbol *
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="Rs.">Rs. (Rupees)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="AED">AED (Dirham)</option>
                <option value="SAR">SAR (Riyal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#12211d]/70 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 987 6543"
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#12211d]/70 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
          </div>

          <div className="pt-3 border-t border-[#12211d]/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#12211d]/60 hover:bg-stone-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-[#0f766e] hover:bg-[#0d5f58] text-white rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
