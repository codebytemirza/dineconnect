import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantCategories } from '@/lib/queries';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    const categories = await getRestaurantCategories(restaurantId);

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
