import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRestaurant } from '@/lib/queries';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        user: null,
      });
    }

    let restaurant = null;
    if (session.restaurantId) {
      restaurant = getRestaurant(session.restaurantId);
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role,
        restaurantId: session.restaurantId,
        name: session.name,
      },
      restaurant,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}
