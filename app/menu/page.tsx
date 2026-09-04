'use client';

import React, { useEffect, useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  FolderPlus,
  Layers,
} from 'lucide-react';
import type { MenuItem } from '@/lib/queries';
import { useRestaurant } from '@/context/restaurant-context';

export default function MenuPage() {
  const { currentRestaurant, currentRestaurantId } = useRestaurant();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Burgers');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function loadMenu() {
    if (!currentRestaurantId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/menu?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }

      // Also load categories
      const catRes = await fetch(`/api/categories?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const catJson = await catRes.json();
      if (catJson.success && Array.isArray(catJson.data)) {
        setCustomCategories(catJson.data);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, [currentRestaurantId]);

  async function toggleAvailability(item: MenuItem) {
    const nextAvailability = item.is_available === 1 ? 0 : 1;
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_available: nextAvailability } : it))
    );

    try {
      const res = await fetch(`/api/menu/${encodeURIComponent(currentRestaurantId)}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: nextAvailability }),
      });
      const json = await res.json();
      if (!json.success) {
        loadMenu();
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      loadMenu();
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));

    try {
      const res = await fetch(`/api/menu/${encodeURIComponent(currentRestaurantId)}/${itemId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) {
        loadMenu();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      loadMenu();
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setFormName('');
    setFormCategory(customCategories[0] || 'Burgers');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormPrice('');
    setFormDescription('');
    setFormAvailable(true);
    setShowAddModal(true);
  }

  function openEditModal(item: MenuItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormPrice(item.price.toString());
    setFormDescription(item.description || '');
    setFormAvailable(item.is_available === 1);
    setShowAddModal(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategoryInput.trim() : formCategory.trim();
    if (!formName || !formPrice || !finalCategory) {
      alert('Please provide item name, price, and category.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/menu/${encodeURIComponent(currentRestaurantId)}/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            category: finalCategory,
            price: parseFloat(formPrice),
            description: formDescription,
            is_available: formAvailable ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) =>
            prev.map((it) => (it.id === editingItem.id ? json.data : it))
          );
          if (!customCategories.includes(finalCategory)) {
            setCustomCategories((prev) => [...prev, finalCategory]);
          }
          setShowAddModal(false);
        }
      } else {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: currentRestaurantId,
            name: formName,
            category: finalCategory,
            price: parseFloat(formPrice),
            description: formDescription,
            is_available: formAvailable ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) => [...prev, json.data]);
          if (!customCategories.includes(finalCategory)) {
            setCustomCategories((prev) => [...prev, finalCategory]);
          }
          setShowAddModal(false);
        }
      }
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddCategoryDirectly(e: React.FormEvent) {
    e.preventDefault();
    const cat = newCategoryName.trim();
    if (!cat) return;
    if (!customCategories.includes(cat)) {
      setCustomCategories((prev) => [...prev, cat]);
    }
    setCategoryFilter(cat);
    setNewCategoryName('');
    setShowCategoryModal(false);
  }

  const currencySymbol = currentRestaurant?.currency || 'PKR';

  // Compute all unique categories
  const allCategorySet = new Set<string>();
  customCategories.forEach((c) => allCategorySet.add(c));
  items.forEach((it) => {
    if (it.category) allCategorySet.add(it.category);
  });
  if (allCategorySet.size === 0) {
    ['Burgers', 'Sides', 'Drinks', 'Desserts'].forEach((s) => allCategorySet.add(s));
  }
  const displayCategories = ['all', ...Array.from(allCategorySet)];

  const filteredItems = items.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Sticky Header & Controls Bar */}
      <div className="px-8 pt-6 pb-4 border-b border-[#12211d]/5 bg-[#f7f5f0] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#12211d]/60 font-medium mb-0.5">
              <span className="font-bold text-[#12211d]">{currentRestaurant?.name || 'Restaurant'}</span>
              <span className="mx-2 text-[#12211d]/30">/</span>
              <span>Menu Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12211d] tracking-tight">
              Restaurant Menu
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={loadMenu}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/10 text-[#12211d] px-3 py-2 rounded-xl text-xs font-semibold card-shadow transition"
              title="Refresh Menu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/15 text-[#12211d] px-3.5 py-2 rounded-xl text-xs font-bold card-shadow transition"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#0f766e]" />
              <span>+ Custom Category</span>
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d5f58] text-white px-4 py-2 rounded-xl text-xs font-bold card-shadow transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Menu Item</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#12211d]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or ingredients..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-[#12211d]/10 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {displayCategories.map((cat) => {
              const isActive = categoryFilter.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition capitalize whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0f766e] text-white shadow-sm'
                      : 'bg-white text-[#12211d]/70 hover:bg-stone-100 hover:text-[#12211d]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contained Scrollable Menu Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!currentRestaurantId ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow border border-[#12211d]/5">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-[#12211d]/20 mb-3" />
            <div className="font-bold text-[#12211d]/70 text-base">No Restaurant Selected</div>
            <div className="text-xs text-[#12211d]/40 mt-1 max-w-xs mx-auto">
              Please create or select a restaurant from the sidebar to manage its menu items.
            </div>
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-[#12211d]/40 font-medium text-sm">
            Loading menu items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow border border-[#12211d]/5">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-[#12211d]/20 mb-3" />
            <div className="font-bold text-[#12211d]/70 text-base">No menu items in this category</div>
            <div className="text-xs text-[#12211d]/40 mt-1 max-w-xs mx-auto">
              Add dishes or drinks using the "Add Menu Item" button above.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const isAvailable = item.is_available === 1;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 card-shadow border transition-all duration-150 flex flex-col justify-between ${
                    isAvailable
                      ? 'border-[#12211d]/5'
                      : 'border-amber-200/60 bg-stone-50/70 opacity-85'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-[#0f766e] bg-[#0f766e]/10 px-2 py-0.5 rounded uppercase">
                          {item.category}
                        </span>
                        <h3 className="text-base font-bold text-[#12211d] mt-1">
                          {item.name}
                        </h3>
                      </div>
                      <span className="text-base font-black text-[#12211d] shrink-0">
                        {currencySymbol} {item.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-[#12211d]/60 line-clamp-3 leading-relaxed mb-4">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#12211d]/5 flex items-center justify-between">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {isAvailable ? 'In Stock' : 'Sold Out'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-[#12211d]/60 hover:text-[#12211d] hover:bg-stone-100 rounded-lg transition"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Add Custom Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 card-shadow border border-[#12211d]/10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#12211d]/10 pb-3">
              <h3 className="text-base font-bold text-[#12211d]">Add Custom Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategoryDirectly} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#12211d]/70 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Gourmet Deals, BBQ, Pizzas, Karahi"
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#12211d]/10">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-[#0f766e] hover:bg-[#0d5f58] text-white rounded-lg shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 card-shadow border border-[#12211d]/10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#12211d]/10 pb-3">
              <h3 className="text-base font-bold text-[#12211d]">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#12211d]/70 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Margherita Pizza, Chicken Karahi"
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Selector with Custom Category option */}
                <div>
                  <label className="block font-bold text-[#12211d]/70 mb-1">
                    Category *
                  </label>
                  {!isCustomCategory ? (
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                    >
                      {Array.from(allCategorySet).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ Custom Category...</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        required
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Enter Category Name"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-emerald-500 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="text-[10px] text-teal-700 underline font-semibold"
                      >
                        Choose existing
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#12211d]/70 mb-1">
                    Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="1200"
                    className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#12211d]/70 mb-1">
                  Description, Sizes & Portions
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Sizes: Small 7'' PKR 650, Medium 10'' PKR 1250, Large 13'' PKR 1850. Deep pan or stuffed crust. Fresh toppings..."
                  className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-[#12211d]/15 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
                <p className="text-[10px] text-[#0f766e] mt-1 font-semibold">
                  💡 Tip: Restaurant-wide pizza sizes, crust pricing, and combo deals can also be configured in the Knowledge Base!
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={formAvailable}
                  onChange={(e) => setFormAvailable(e.target.checked)}
                  className="w-4 h-4 text-[#0f766e] rounded focus:ring-[#0f766e]"
                />
                <label htmlFor="availCheck" className="font-bold text-[#12211d]">
                  Available to order now (In Stock)
                </label>
              </div>

              <div className="pt-3 border-t border-[#12211d]/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-[#12211d]/70 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-[#0f766e] hover:bg-[#0d5f58] text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
