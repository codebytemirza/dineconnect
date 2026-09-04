import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp/manager';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const restaurantId = body.restaurantId || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    const success = await whatsappManager.disconnectBridge(restaurantId);

    return NextResponse.json({
      success,
      message: 'WhatsApp bridge disconnected and unlinked successfully',
    });
  } catch (error: any) {
    console.error('Error in WhatsApp disconnect route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disconnect WhatsApp bridge' },
      { status: 500 }
    );
  }
}
