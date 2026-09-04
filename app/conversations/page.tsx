'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  User,
  Bot,
  QrCode,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/queries';
import { useRestaurant } from '@/context/restaurant-context';
import { WhatsAppModal } from '@/components/whatsapp-modal';

interface ConversationSummary {
  customer_phone: string;
  customer_name: string | null;
  last_message: string;
  last_timestamp: string;
  message_count: number;
}

export default function ConversationsPage() {
  const { currentRestaurant, currentRestaurantId } = useRestaurant();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    if (!currentRestaurantId) return;
    try {
      const res = await fetch(`/api/conversations?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success) {
        setConversations(json.data);
        if (!selectedPhone && json.data.length > 0) {
          setSelectedPhone(json.data[0].customer_phone);
        } else if (json.data.length === 0) {
          setSelectedPhone(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadChatHistory(phone: string) {
    if (!currentRestaurantId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/conversations?restaurantId=${encodeURIComponent(currentRestaurantId)}&customerPhone=${encodeURIComponent(phone)}`
      );
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 3000);
    return () => clearInterval(interval);
  }, [currentRestaurantId]);

  useEffect(() => {
    if (selectedPhone) {
      loadChatHistory(selectedPhone);
      const interval = setInterval(() => {
        loadChatHistory(selectedPhone);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedPhone, currentRestaurantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    return (
      searchQuery.trim() === '' ||
      c.customer_phone.includes(searchQuery) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedConv = conversations.find((c) => c.customer_phone === selectedPhone);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Top Header */}
      <div className="px-8 pt-6 pb-4 border-b border-[#12211d]/5 bg-[#f7f5f0] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#12211d]/60 font-medium mb-0.5">
              <span className="font-bold text-[#12211d]">{currentRestaurant?.name || 'Restaurant'}</span>
              <span className="mx-2 text-[#12211d]/30">/</span>
              <span>Live Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12211d] tracking-tight flex items-center gap-3">
              <span>WhatsApp Conversations</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#0f766e] bg-[#0f766e]/10 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Feed
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/15 text-[#12211d] px-3 py-2 rounded-xl text-xs font-semibold card-shadow transition"
            >
              <QrCode className="w-3.5 h-3.5 text-[#e8603c]" />
              <span>Bridge Settings</span>
            </button>
            <button
              onClick={() => {
                loadConversations();
                if (selectedPhone) loadChatHistory(selectedPhone);
              }}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 border border-[#12211d]/10 text-[#12211d] px-3 py-2 rounded-xl text-xs font-semibold card-shadow transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contained Split-Pane Layout (Independent Scrollbars) */}
      <div className="flex-1 p-8 overflow-hidden">
        <div className="h-full bg-white rounded-2xl card-shadow border border-[#12211d]/5 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Pane: Conversations List (5 Cols) */}
          <div className="md:col-span-5 border-r border-[#12211d]/5 flex flex-col h-full overflow-hidden">
            {/* Search Box */}
            <div className="p-3.5 border-b border-[#12211d]/5 bg-stone-50/50 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#12211d]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-1.5 text-xs bg-white rounded-xl border border-[#12211d]/10 focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#12211d]/5">
              {!currentRestaurantId ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto text-[#12211d]/20 mb-2" />
                  <div className="font-bold text-xs text-[#12211d]/60">No Restaurant Selected</div>
                  <div className="text-[11px] text-[#12211d]/40 mt-0.5">
                    Select or create a restaurant to view chats.
                  </div>
                </div>
              ) : loading ? (
                <div className="p-8 text-center text-xs text-[#12211d]/40 font-medium">
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto text-[#12211d]/20 mb-2" />
                  <div className="font-bold text-xs text-[#12211d]/60">No conversations yet</div>
                  <div className="text-[11px] text-[#12211d]/40 mt-0.5">
                    Messages from WhatsApp customers will show up here.
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedPhone === conv.customer_phone;
                  const formattedTime = new Date(conv.last_timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <button
                      key={conv.customer_phone}
                      onClick={() => setSelectedPhone(conv.customer_phone)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#0f766e]/10 border-l-4 border-[#0f766e]'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#e8603c]/15 text-[#e8603c] font-black text-xs flex items-center justify-center shrink-0">
                        {conv.customer_name ? conv.customer_name.slice(0, 2).toUpperCase() : 'WA'}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-xs text-[#12211d] truncate">
                            {conv.customer_name || conv.customer_phone}
                          </span>
                          <span className="text-[10px] text-[#12211d]/40 font-medium shrink-0">
                            {formattedTime}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#12211d]/40 mb-1 font-mono">
                          {conv.customer_phone}
                        </div>

                        <p className="text-xs text-[#12211d]/70 truncate leading-snug">
                          {conv.last_message}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Transcript (7 Cols) */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-stone-50/40">
            {selectedPhone && selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-3.5 bg-white border-b border-[#12211d]/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-[#12211d]">
                        {selectedConv.customer_name || 'WhatsApp Customer'}
                      </h3>
                      <div className="text-[10px] text-[#12211d]/40 font-mono">
                        {selectedConv.customer_phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#0f766e] bg-[#0f766e]/10 px-2 py-0.5 rounded-full">
                      LangChain Agent Active
                    </span>
                  </div>
                </div>

                {/* Chat History Area */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-[#12211d]/40">
                      Loading transcript...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#12211d]/40">
                      No messages in this conversation.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCustomer = msg.role === 'customer';
                      const time = new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-bold text-[#12211d]/40 uppercase tracking-wider">
                              {isCustomer ? 'Customer' : 'DineConnect AI'}
                            </span>
                            <span className="text-[10px] text-[#12211d]/30">·</span>
                            <span className="text-[10px] text-[#12211d]/30">{time}</span>
                          </div>

                          <div
                            className={`max-w-md rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                              isCustomer
                                ? 'bg-white text-[#12211d] rounded-tl-sm border border-[#12211d]/10'
                                : 'bg-[#0f231d] text-white rounded-tr-sm shadow-teal-900/10'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Footer Indicator */}
                <div className="p-2.5 bg-white border-t border-[#12211d]/5 text-center text-[10px] text-[#12211d]/40 font-medium shrink-0">
                  Live WhatsApp stream · LangChain OpenAI agent active for {currentRestaurant?.name || 'this restaurant'}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#12211d]/20 mb-3" />
                <div className="font-bold text-sm text-[#12211d]/60">No conversation selected</div>
                <div className="text-xs text-[#12211d]/40 mt-1 max-w-xs">
                  Select a conversation from the left to view the live transcript.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onStatusChange={loadConversations}
      />
    </div>
  );
}
