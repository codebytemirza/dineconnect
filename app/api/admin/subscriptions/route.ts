import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';
import {
  getSaaSRevenueStats,
  getRestaurants,
  checkAndUpdateRestaurantSubscription,
  recordSubscriptionPayment,
  setRestaurantSubscriptionSuspension,
  Restaurant,
} from '@/lib/queries';
import { whatsappManager } from '@/lib/whatsapp/manager';

// GET: Returns SaaS revenue stats and detailed restaurant subscription records
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Superadmin only.' }, { status: 403 });
    }

    const saasStats = await getSaaSRevenueStats();
    const restaurants = await getRestaurants();

    const enrichedRestaurants = await Promise.all(restaurants.map(async (r: Restaurant) => {
      const sub = await checkAndUpdateRestaurantSubscription(r.id);
      // If suspended, ensure bridge is disconnected
      if (sub.isSuspended) {
        try {
          await whatsappManager.disconnectBridge(r.id);
        } catch {}
      }
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        currency: r.currency,
        created_at: r.created_at,
        subscription: sub,
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: saasStats,
        restaurants: enrichedRestaurants,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch SaaS subscription data' },
      { status: 500 }
    );
  }
}

// POST: Record subscription payment for a restaurant
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { restaurantId, amount, notes, paymentDate } = body;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurantId is required' }, { status: 400 });
    }

    const ok = await recordSubscriptionPayment({
      restaurantId,
      amount: amount ? parseFloat(amount) : undefined,
      notes,
      paymentDate,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 400 });
    }

    const updatedSub = await checkAndUpdateRestaurantSubscription(restaurantId);

    return NextResponse.json({
      success: true,
      message: `Subscription payment recorded! Next billing date: ${new Date(updatedSub.dueDate).toLocaleDateString()}`,
      data: updatedSub,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing payment' },
      { status: 500 }
    );
  }
}

// PATCH: Toggle suspension manually
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { restaurantId, suspend } = body;

    if (!restaurantId || typeof suspend !== 'boolean') {
      return NextResponse.json({ success: false, error: 'restaurantId and suspend boolean required' }, { status: 400 });
    }

    await setRestaurantSubscriptionSuspension(restaurantId, suspend);

    if (suspend) {
      try {
        await whatsappManager.disconnectBridge(restaurantId);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: suspend ? 'Restaurant suspended & WhatsApp socket closed.' : 'Restaurant suspension lifted.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating suspension' },
      { status: 500 }
    );
  }
}
