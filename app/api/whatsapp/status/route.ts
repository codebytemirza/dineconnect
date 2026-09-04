import { NextRequest, NextResponse } from 'next/server';
import { whatsappManager } from '@/lib/whatsapp/manager';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    const status = await whatsappManager.getStatus(restaurantId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error in WhatsApp status route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get WhatsApp status' },
      { status: 500 }
    );
  }
}
