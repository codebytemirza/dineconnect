import { NextRequest, NextResponse } from 'next/server';
import { getMenuItems, createMenuItem } from '@/lib/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const items = await getMenuItems(restaurantId, { category, availableOnly });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error fetching menu items for restaurant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;
    const body = await req.json();
    const { name, description, price, category, is_available } = body;

    if (!name || price === undefined || !category) {
      return NextResponse.json(
        { success: false, error: 'Name, price, and category are required' },
        { status: 400 }
      );
    }

    const newItem = await createMenuItem({
      restaurant_id: restaurantId,
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
