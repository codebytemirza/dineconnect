import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp/manager';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const restaurantId = body.restaurantId || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    const result = await whatsappManager.startBridge(restaurantId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in WhatsApp connect route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start WhatsApp bridge' },
      { status: 500 }
    );
  }
}
