import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteRestaurantCompletely, getRestaurant, getRestaurantUsers, getUserByUsername, updateRestaurantUserCredentials } from '@/lib/queries';
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Superadmin access required' }, { status: 403 });
    }
    const { id: restaurantId } = await params;
    const restaurant = await getRestaurant(restaurantId);
    if (!restaurant) return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });

    const { userId, username, password, name } = await req.json();
    if (!userId || (!username && !password && !name)) {
      return NextResponse.json({ success: false, error: 'Choose a user and provide at least one value to update.' }, { status: 400 });
    }
    const user = (await getRestaurantUsers(restaurantId)).find((candidate) => candidate.id === userId);
    if (!user) return NextResponse.json({ success: false, error: 'Restaurant login was not found.' }, { status: 404 });

    const cleanUsername = username?.trim().toLowerCase();
    if (cleanUsername && cleanUsername !== user.username) {
      const existing = await getUserByUsername(cleanUsername);
      if (existing && existing.id !== user.id) return NextResponse.json({ success: false, error: `Username "${cleanUsername}" is already taken.` }, { status: 409 });
    }
    if (password !== undefined && password.length > 0 && password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const updated = await updateRestaurantUserCredentials(user.id, {
      username: cleanUsername || undefined,
      password: password?.trim() || undefined,
      name: name?.trim() || undefined,
    });
    return NextResponse.json({ success: true, data: { id: updated.id, username: updated.username, name: updated.name }, message: 'Restaurant login updated.' });
  } catch (error: any) {
    console.error('Error updating restaurant credentials:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update restaurant login' }, { status: 500 });
  }
}
