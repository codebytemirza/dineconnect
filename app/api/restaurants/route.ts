import { NextRequest, NextResponse } from 'next/server';
import { getAllRestaurants, createRestaurant } from '@/lib/queries';

export async function GET() {
  try {
    const restaurants = await getAllRestaurants();
    return NextResponse.json({
      success: true,
      data: restaurants,
    });
  } catch (error: any) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, address, currency } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant name is required' },
        { status: 400 }
      );
    }

    const restaurant = await createRestaurant({
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      currency: currency?.trim() || 'PKR',
    });

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error: any) {
    console.error('Error creating restaurant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
