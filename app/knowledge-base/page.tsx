'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  CreditCard,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import type { KnowledgeBaseItem } from '@/lib/queries';
import { useRestaurant } from '@/context/restaurant-context';

export default function KnowledgeBasePage() {
  const { currentRestaurant, currentRestaurantId } = useRestaurant();
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Payment Info');
  const [formContent, setFormContent] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadKnowledgeBase() {
    if (!currentRestaurantId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/knowledge-base?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Failed to load knowledge base:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKnowledgeBase();
  }, [currentRestaurantId]);

  function openAddModal() {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('Payment Info');
    setFormContent('');
    setFormActive(true);
    setShowModal(true);
  }

  function openEditModal(item: KnowledgeBaseItem) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormContent(item.content);
    setFormActive(item.is_active === 1);
    setShowModal(true);
  }

  function applyTemplate(type: 'payment' | 'hours' | 'delivery' | 'halal' | 'pizza') {
    openAddModal();
    if (type === 'pizza') {
      setFormTitle('Pizza Sizing, Crust Options & Custom Portions');
      setFormCategory('Menu Concepts & Sizes');
      setFormContent('Pizza Sizes & Slices:\n• Small (7 inch, 4 slices) — PKR 650\n• Medium (10 inch, 6 slices) — PKR 1,250\n• Large (13 inch, 8 slices) — PKR 1,850\n• Extra Large / Party (16 inch, 12 slices) — PKR 2,400\n\nCrust Options:\n• Traditional Pan Crust (Included free)\n• Italian Thin Crust (Included free)\n• Cheese Stuffed Crust (+PKR 250)\n• Kabab Stuffed Crust (+PKR 350)\n\nCustomizations: Extra cheese +PKR 200, Dipping sauces (Garlic Mayo, Ranch, Spicy Peri) +PKR 80.');
    } else if (type === 'payment') {
      setFormTitle('Bank Account & Online Transfer Details');
      setFormCategory('Payment Info');
      setFormContent('We accept Cash on Delivery and Online Payment.\n• Bank: Meezan Bank Ltd\n• Account Title: The Restaurant Pvt\n• IBAN: PK36MEZN00123456789012\n• EasyPaisa / JazzCash: 0328-4119134\nPlease transfer the total amount and share the screenshot in this chat!');
    } else if (type === 'hours') {
      setFormTitle('Opening & Closing Timings');
      setFormCategory('Operating Hours');
      setFormContent('We are open 7 days a week from 12:00 PM (Noon) to 02:00 AM. Kitchen orders close 30 minutes before closing.');
    } else if (type === 'delivery') {
      setFormTitle('Delivery Coverage & Charges');
      setFormCategory('Delivery & Charges');
      setFormContent('Flat PKR 150 delivery across the city within 8km. Orders above PKR 2,500 receive FREE delivery! Standard delivery time: 35-45 minutes.');
    } else if (type === 'halal') {
      setFormTitle('Halal & Allergen Information');
      setFormCategory('Policies & FAQs');
      setFormContent('All prime beef and chicken ingredients are 100% Halal certified fresh daily. Gluten-free wraps available on demand.');
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !formCategory) return;

    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await fetch('/api/knowledge-base', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            title: formTitle.trim(),
            category: formCategory.trim(),
            content: formContent.trim(),
            is_active: formActive ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) =>
            prev.map((it) => (it.id === editingItem.id ? json.data : it))
          );
          setShowModal(false);
          setToast('Knowledge base item updated successfully!');
          setTimeout(() => setToast(null), 3000);
        }
      } else {
        const res = await fetch('/api/knowledge-base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: currentRestaurantId,
            title: formTitle.trim(),
            category: formCategory.trim(),
            content: formContent.trim(),
            is_active: formActive ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) => [json.data, ...prev]);
          setShowModal(false);
          setToast('Knowledge base item created! The WhatsApp agent can now use this information.');
          setTimeout(() => setToast(null), 4000);
        }
      }
    } catch (err) {
      console.error('Error saving knowledge base item:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this knowledge base entry?')) return;
    try {
      const res = await fetch(`/api/knowledge-base?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((it) => it.id !== id));
        setToast('Entry deleted.');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  const categories = [
    'all',
    'Menu Concepts & Sizes',
    'Payment Info',
    'Operating Hours',
    'Delivery & Charges',
    'Policies & FAQs',
  ];

  const filteredItems = items.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-6 z-50 bg-[#0f766e] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-[#12211d]/5 bg-[#f7f5f0] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#12211d]/60 font-medium mb-0.5">
              <span className="font-bold text-[#12211d]">{currentRestaurant?.name || 'Restaurant'}</span>
              <span className="mx-2 text-[#12211d]/30">/</span>
              <span>AI Knowledge Base</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12211d] tracking-tight">
              Restaurant Knowledge Base
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={loadKnowledgeBase}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/10 text-[#12211d] px-3 py-2 rounded-xl text-xs font-semibold card-shadow transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d5f58] text-white px-4 py-2 rounded-xl text-xs font-bold card-shadow transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Knowledge Entry</span>
            </button>
          </div>
        </div>

        {/* Informative Banner */}
        <div className="bg-white rounded-2xl p-4 border border-[#12211d]/5 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0f766e] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#12211d]">
                Agent Knowledge Grounding
              </div>
              <div className="text-[11px] text-[#12211d]/60 leading-snug">
                Your AI agent automatically queries these answers when customers ask about pizza sizes, crust options, bank accounts, opening timings, and delivery fees.
              </div>
            </div>
          </div>

          {/* Quick Preset Templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[10px] font-bold text-[#12211d]/40 uppercase tracking-wider mr-1">
              Quick Templates:
            </span>
            <button
              onClick={() => applyTemplate('pizza')}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition border border-amber-200/50"
            >
              🍕 + Pizza Sizes & Crusts
            </button>
            <button
              onClick={() => applyTemplate('payment')}
              className="px-2.5 py-1 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
            >
              + Bank Account
            </button>
            <button
              onClick={() => applyTemplate('hours')}
              className="px-2.5 py-1 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
            >
              + Timings
            </button>
            <button
              onClick={() => applyTemplate('delivery')}
              className="px-2.5 py-1 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
            >
              + Delivery Fee
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#12211d]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base entries..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-[#12211d]/10 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => {
              const isActive = categoryFilter.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-sm'
                      : 'bg-white text-[#12211d]/70 hover:bg-stone-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!currentRestaurantId ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow border border-[#12211d]/5">
            <BookOpen className="w-12 h-12 mx-auto text-[#12211d]/20 mb-3" />
            <div className="font-bold text-[#12211d]/70 text-base">No Restaurant Selected</div>
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-[#12211d]/40 font-medium text-sm">
            Loading knowledge base...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow border border-[#12211d]/5 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-[#12211d]/20" />
            <div className="font-bold text-[#12211d]/70 text-base">No Knowledge Base Entries Yet</div>
            <p className="text-xs text-[#12211d]/40 max-w-sm mx-auto">
              Add your restaurant's bank account details, operating timings, and delivery policies so your AI bot answers customer questions accurately.
            </p>
            <button
              onClick={() => applyTemplate('payment')}
              className="bg-[#0f766e] hover:bg-[#0d5f58] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
            >
              Add Bank Account Info
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 card-shadow border border-[#12211d]/5 flex flex-col justify-between space-y-4 hover:border-[#12211d]/15 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-bold tracking-wider text-[#0f766e] bg-[#0f766e]/10 px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_active === 1
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {item.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#12211d]">{item.title}</h3>
                  <p className="text-xs text-[#12211d]/70 leading-relaxed whitespace-pre-wrap font-sans">
                    {item.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#12211d]/5 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#12211d]/40">
                    Updated: {new Date(item.updated_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-[#12211d]/60 hover:text-[#12211d] hover:bg-stone-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 card-shadow border border-[#12211d]/10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#12211d]/10 pb-3">
              <h3 className="text-base font-bold text-[#12211d]">
                {editingItem ? 'Edit Knowledge Base Entry' : 'Add Knowledge Base Entry'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#12211d]/70 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                  >
                    <option value="Menu Concepts & Sizes">Menu Concepts & Sizes (Pizza sizes, crusts, portions)</option>
                    <option value="Payment Info">Payment Info</option>
                    <option value="Operating Hours">Operating Hours</option>
                    <option value="Delivery & Charges">Delivery & Charges</option>
                    <option value="Policies & FAQs">Policies & FAQs</option>
                    <option value="General Info">General Info</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#12211d]/70 mb-1">
                    Status
                  </label>
                  <select
                    value={formActive ? '1' : '0'}
                    onChange={(e) => setFormActive(e.target.value === '1')}
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                  >
                    <option value="1">Active (Used by AI Agent)</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#12211d]/70 mb-1">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Bank Account & EasyPaisa Transfer Details"
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#12211d]/70 mb-1">
                  Information / Policy Details *
                </label>
                <textarea
                  rows={5}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Provide complete details, account numbers, timing rules, or allergy advice here. The AI bot will use this exact information when customers inquire."
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
              </div>

              <div className="pt-2 border-t border-[#12211d]/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-bold text-[#12211d]/70 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-[#0f766e] hover:bg-[#0d5f58] text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
