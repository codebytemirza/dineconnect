import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';
import { checkAndUpdateRestaurantSubscription } from '@/lib/queries';
import { whatsappManager } from '@/lib/whatsapp/manager';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    const url = new URL(req.url);
    let restaurantId = url.searchParams.get('restaurantId');

    if (!restaurantId && session?.restaurantId) {
      restaurantId = session.restaurantId;
    }

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurantId required' }, { status: 400 });
    }

    const sub = await checkAndUpdateRestaurantSubscription(restaurantId);

    // If 2+ days overdue, automatically close and disconnect WhatsApp bridge socket
    if (sub.isSuspended) {
      try {
        await whatsappManager.disconnectBridge(restaurantId);
      } catch (bridgeErr) {
        console.warn(`Auto-disconnected bridge for suspended restaurant ${restaurantId}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: sub,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
