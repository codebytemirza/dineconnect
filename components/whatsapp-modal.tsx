'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  PowerOff,
  Radio,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useRestaurant } from '@/context/restaurant-context';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function WhatsAppModal({ isOpen, onClose, onStatusChange }: WhatsAppModalProps) {
  const { currentRestaurant, currentRestaurantId } = useRestaurant();
  const [status, setStatus] = useState<string>('disconnected');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/whatsapp/status?restaurantId=${encodeURIComponent(currentRestaurantId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data.status);
        setQrDataUrl(json.data.qrDataUrl);
        setConnectedPhone(json.data.connectedPhone);
        if (json.data.status === 'connected') {
          onStatusChange?.();
        }
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      const interval = setInterval(checkStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentRestaurantId]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: currentRestaurantId }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data.status);
        setQrDataUrl(json.data.qrDataUrl);
      }
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect this WhatsApp number? This will unlink the bot.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: currentRestaurantId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus('disconnected');
        setQrDataUrl(null);
        setConnectedPhone(null);
        onStatusChange?.();
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setActionLoading(false);
    }
  }

  if (!isOpen) return null;

  const isConnected = status === 'connected';
  const isQrReady = status === 'qr_ready' && qrDataUrl;
  const isConnecting = status === 'connecting' && !qrDataUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 card-shadow border border-[#12211d]/10 space-y-6 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-[#12211d]/60 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-bold tracking-widest text-[#0f766e] uppercase">
              WhatsApp Bridge Manager
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#12211d] tracking-tight">
            {currentRestaurant?.name || 'Restaurant'}
          </h2>
          <p className="text-xs text-[#12211d]/60 mt-0.5">
            Link a WhatsApp phone number to automatically take orders using the LangChain OpenAI agent.
          </p>
        </div>

        {/* Body State: Connected */}
        {isConnected && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div>
              <div className="font-bold text-base text-emerald-950">
                WhatsApp Bridge is Live & Connected
              </div>
              <div className="text-xs text-emerald-700 mt-1 font-mono">
                {connectedPhone ? `+${connectedPhone.replace(/[^0-9]/g, '')}` : 'Device linked and active'}
              </div>
            </div>

            <p className="text-xs text-emerald-800/80 leading-relaxed max-w-sm mx-auto">
              Incoming messages to this WhatsApp number will be handled autonomously by your restaurant's AI Agent using the live menu.
            </p>

            <button
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 px-4 py-2 rounded-xl shadow-xs transition"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>{actionLoading ? 'Disconnecting...' : 'Disconnect WhatsApp'}</span>
            </button>
          </div>
        )}

        {/* Body State: QR Code Ready */}
        {isQrReady && (
          <div className="space-y-4 text-center">
            <div className="bg-stone-50 border border-[#12211d]/10 rounded-2xl p-4 flex flex-col items-center justify-center max-w-xs mx-auto shadow-inner">
              <img
                src={qrDataUrl!}
                alt="WhatsApp QR Code"
                className="w-56 h-56 object-contain rounded-lg"
              />
              <div className="text-[11px] text-[#12211d]/50 font-medium mt-2 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#0f766e] animate-pulse" />
                <span>Waiting for scan...</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-left bg-[#0f231d] text-white rounded-xl p-4 text-xs space-y-1.5">
              <div className="text-[10px] font-bold text-[#e8603c] tracking-widest uppercase">
                How to link:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-white/80 leading-relaxed">
                <li>Open <strong>WhatsApp</strong> on your phone</li>
                <li>Go to <strong>Settings</strong> &gt; <strong>Linked devices</strong></li>
                <li>Tap <strong>Link a device</strong> and scan the QR code above</li>
              </ol>
            </div>
          </div>
        )}

        {/* Body State: Disconnected / Start Connecting */}
        {!isConnected && !isQrReady && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <QrCode className="w-7 h-7" />
            </div>

            <div>
              <div className="font-bold text-base text-[#12211d]">
                {isConnecting ? 'Initializing Baileys Socket...' : 'No WhatsApp Number Linked'}
              </div>
              <p className="text-xs text-[#12211d]/60 mt-1 max-w-sm mx-auto">
                {isConnecting
                  ? 'Generating security credentials and QR code. This takes 2-3 seconds...'
                  : 'Click below to generate a QR code and connect your restaurant\'s WhatsApp account.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnect}
                disabled={actionLoading || isConnecting}
                className="inline-flex items-center justify-center gap-2 bg-[#0f766e] hover:bg-[#0d5f58] text-white text-sm font-bold px-6 py-3 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {actionLoading || isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Starting Bridge...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Generate Connection QR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-4 border-t border-[#12211d]/10 flex items-center justify-between text-[11px] text-[#12211d]/50">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Multi-Device End-to-End Encryption</span>
          </div>
          <button onClick={checkStatus} className="hover:text-[#12211d] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Check status</span>
          </button>
        </div>
      </div>
    </div>
  );
}
