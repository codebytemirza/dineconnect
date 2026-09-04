import { NextRequest, NextResponse } from 'next/server';
import { getRecentConversations, getChatHistory } from '@/lib/queries';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';
    const customerPhone = searchParams.get('customerPhone');

    if (customerPhone) {
      const messages = await getChatHistory(restaurantId, customerPhone);
      return NextResponse.json({
        success: true,
        data: messages,
      });
    }

    const conversations = await getRecentConversations(restaurantId);
    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
