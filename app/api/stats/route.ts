import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/queries';
import { env } from '@/lib/env';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || env.DEFAULT_RESTAURANT_ID || 'burger-joint';

    const stats = await getDashboardStats(restaurantId);

    // Check WhatsApp auth state
    const authDir = path.join(process.cwd(), 'data', 'whatsapp-auth');
    const hasCreds = fs.existsSync(path.join(authDir, 'creds.json'));

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        whatsappBridge: {
          enabled: env.ENABLE_WHATSAPP === 'true',
          linked: hasCreds,
          authDir,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
