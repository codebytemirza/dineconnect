import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getAllRestaurants,
  createRestaurant,
  createUser,
  getUserByUsername,
  getRestaurantUsers,
  createKnowledgeBaseItem,
  getDashboardStats,
  recordSubscriptionPayment,
  Restaurant,
} from '@/lib/queries';
import { updateOne } from '@/lib/db';
import { whatsappManager } from '@/lib/whatsapp/manager';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Superadmin access required' },
        { status: 403 }
      );
    }

    const restaurants = await getAllRestaurants();
    const enriched = await Promise.all(
      restaurants.map(async (r) => {
        const users = await getRestaurantUsers(r.id);
        const stats = await getDashboardStats(r.id);
        const waStatus = await whatsappManager.getStatus(r.id);

        return {
          ...r,
          users: users.map((u) => ({ id: u.id, username: u.username, name: u.name })),
          stats: {
            ordersToday: stats.ordersToday,
            revenueToday: stats.revenueToday,
            activeConversations: stats.activeConversations,
          },
          whatsapp: {
            status: waStatus.status,
            connectedPhone: waStatus.connectedPhone,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    console.error('Error in admin restaurants GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      phone,
      address,
      currency,
      username,
      password,
      managerName,
    } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Restaurant name, manager username, and password are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const cleanUsername = username.trim().toLowerCase();
    const existingUser = await getUserByUsername(cleanUsername);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Username "${cleanUsername}" is already taken. Please choose another.` },
        { status: 409 }
      );
    }

    // 1. Create Restaurant
    const restaurant = await createRestaurant({
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      currency: currency?.trim() || 'PKR',
    });

    // 2. Create Restaurant Manager User
    const user = await createUser({
      username: cleanUsername,
      password: password.trim(),
      role: 'restaurant',
      restaurant_id: restaurant.id,
      name: managerName?.trim() || `${restaurant.name} Manager`,
    });

    // 3. Initialize default Knowledge Base entries for the new restaurant
    await createKnowledgeBaseItem({
      restaurant_id: restaurant.id,
      title: 'Operating Hours & Schedule',
      category: 'Operating Hours',
      content: 'Open daily from 12:00 PM to 02:00 AM. Kitchen orders close 30 minutes before closing time.',
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurant.id,
      title: 'Online Payment & Bank Details',
      category: 'Payment Info',
      content: `We accept Cash on Delivery and Online Payment. Please transfer to our account and send the confirmation receipt.\nBank: Bank Transfer / Digital Wallet\nContact: ${restaurant.phone || '+92 328 4119134'}`,
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurant.id,
      title: 'Delivery Policy & Zones',
      category: 'Delivery & Charges',
      content: 'Standard delivery fee: PKR 150. Free delivery on orders exceeding PKR 2,500. Estimated delivery time: 35-45 minutes.',
      is_active: 1,
    });

    // 4. Handle Subscription Payment on Onboard
    const parsedAmount = Number(body.paymentAmount) || 5000;
    if (body.isPaymentDone !== false) {
      // Payment done: automatically pick date or use provided date
      const payDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
      const payIso = payDate.toISOString();
      const nextDueIso = new Date(payDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await recordSubscriptionPayment({
        restaurantId: restaurant.id,
        amount: parsedAmount,
        notes: `Initial onboarding subscription payment recorded (${payDate.toLocaleDateString()})`,
      });

      await updateOne<Restaurant>('restaurants', restaurant.id, {
        subscription_status: 'paid',
        subscription_due_date: nextDueIso,
        last_payment_date: payIso,
        is_suspended: false as any,
        monthly_rate: parsedAmount,
      });
    } else {
      // Payment pending / trial
      const pendingDueIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await updateOne<Restaurant>('restaurants', restaurant.id, {
        subscription_status: 'due',
        subscription_due_date: pendingDueIso,
        last_payment_date: null,
        is_suspended: false as any,
        monthly_rate: parsedAmount,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      message: `Restaurant "${restaurant.name}" and login account "${user.username}" created successfully!`,
    });
  } catch (error: any) {
    console.error('Error in admin restaurants POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create restaurant and login' },
      { status: 500 }
    );
  }
}
