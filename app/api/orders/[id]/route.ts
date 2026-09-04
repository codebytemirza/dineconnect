import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus, OrderStatus, getRestaurant, saveChatMessage } from '@/lib/queries';
import { whatsappManager } from '@/lib/whatsapp/manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error fetching order by ID:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { status } = body;
    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Send Automated WhatsApp Message to Customer
    let messageSent = false;
    if (updated.customer_phone) {
      const restaurant = await getRestaurant(updated.restaurant_id);
      const currency = restaurant?.currency || 'PKR';
      const customerName = updated.customer_name || 'Customer';

      let message = '';
      switch (status) {
        case 'confirmed':
          message = `✅ *Order Confirmed!*\n\nHi ${customerName}, your order *#${updated.id}* has been confirmed by *${restaurant?.name || 'the kitchen'}*.\n\n💰 Total: *${currency} ${updated.total_amount.toFixed(2)}*\n💳 Payment: *${updated.payment_method || 'Cash on Delivery'}*\n📍 Address: *${updated.delivery_address || 'Pickup'}*\n\nYour order has been queued for preparation! 👨‍🍳`;
          break;
        case 'preparing':
          message = `👨‍🍳 *Kitchen Update: Preparing Your Food!*\n\nHi ${customerName}, your order *#${updated.id}* is now being freshly prepared by the kitchen team. It will be ready shortly! 🔥`;
          break;
        case 'completed':
          message = `🛵 *Order Complete / Out for Delivery!*\n\nHi ${customerName}, your order *#${updated.id}* is ready and on its way to you!\n\n💰 Total to pay: *${currency} ${updated.total_amount.toFixed(2)}* (${updated.payment_method || 'Cash on Delivery'})\n\nEnjoy your meal, and thank you for ordering with *${restaurant?.name || 'us'}*! ❤️`;
          break;
        case 'cancelled':
          message = `❌ *Order Cancelled*\n\nHi ${customerName}, your order *#${updated.id}* has been cancelled. If you have questions or need assistance, please reply directly to this chat.`;
          break;
        default:
          break;
      }

      if (message) {
        // Asynchronously dispatch WhatsApp message and log to chat history
        whatsappManager
          .sendMessage(updated.restaurant_id, updated.customer_phone, message)
          .then((sent) => {
            if (sent) {
              saveChatMessage(updated.restaurant_id, updated.customer_phone!, 'bot', message).catch((logErr) => {
                console.error('Failed to log status update WhatsApp message:', logErr);
              });
            }
          })
          .catch((sendErr) => {
            console.error('Failed to dispatch status update WhatsApp message:', sendErr);
          });
        messageSent = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      notificationSent: messageSent,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
