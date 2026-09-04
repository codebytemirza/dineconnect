import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteRestaurantCompletely, getRestaurant } from '@/lib/queries';
import { whatsappManager } from '@/lib/whatsapp/manager';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Superadmin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const restaurant = await getRestaurant(id);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // 1. Disconnect active WhatsApp Baileys socket and delete auth files
    try {
      await whatsappManager.disconnectBridge(id);
    } catch (bridgeErr) {
      console.warn(`Bridge disconnect note for ${id}:`, bridgeErr);
    }

    // 2. Cascade delete all database records (menu, orders, items, chats, knowledge base, users, restaurant)
    await deleteRestaurantCompletely(id);

    console.log(`🗑️ [SUPERADMIN] Restaurant "${restaurant.name}" (${id}) and all data completely wiped.`);

    return NextResponse.json({
      success: true,
      message: `Restaurant "${restaurant.name}" and all sessions, menus, orders, knowledge base, and logins have been completely wiped.`,
    });
  } catch (error: any) {
    console.error('Error wiping restaurant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to wipe restaurant' },
      { status: 500 }
    );
  }
}
