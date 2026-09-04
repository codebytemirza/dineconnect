import { NextRequest, NextResponse } from 'next/server';
import { getMenuItems, createMenuItem } from '@/lib/queries';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';
    const category = searchParams.get('category') || undefined;
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const items = await getMenuItems(restaurantId, { category, availableOnly });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, name, description, price, category, is_available } = body;

    const targetRestaurantId = restaurant_id || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    if (!name || price === undefined || !category) {
      return NextResponse.json(
        { success: false, error: 'Name, price, and category are required' },
        { status: 400 }
      );
    }

    const newItem = await createMenuItem({
      restaurant_id: targetRestaurantId,
      name,
      description: description || null,
      price: parseFloat(price),
      category,
      is_available: is_available !== undefined ? (is_available ? 1 : 0) : 1,
    });

    return NextResponse.json({
      success: true,
      data: newItem,
    });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
