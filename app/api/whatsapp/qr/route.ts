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
      data: {
        restaurantId,
        status: status.status,
        qrDataUrl: status.qrDataUrl,
        connectedPhone: status.connectedPhone,
      },
    });
  } catch (error: any) {
    console.error('Error fetching WhatsApp QR code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch QR' },
      { status: 500 }
    );
  }
}
