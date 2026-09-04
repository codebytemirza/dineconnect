import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  getMenuItems,
  getOrCreateCustomer,
  createOrder,
  MenuItem,
  getKnowledgeBaseItems,
  getRestaurant,
  KnowledgeBaseItem,
  getOrderById,
  getLatestOrderByCustomerPhone,
  updateOrderDetails,
  updateOrderStatus,
} from '../queries';
import { env } from '../env';

export function createOrderToolsForRestaurant(restaurantId: string): DynamicStructuredTool[] {
  const getCurrencySymbol = async () => {
    const restaurant = await getRestaurant(restaurantId);
    return restaurant?.currency || 'PKR';
  };

// 1. Tool: getMenu
const getMenuTool = new DynamicStructuredTool({
  name: 'get_menu',
  description: 'Retrieves all available items on the restaurant menu, optionally filtered by category (e.g. Burgers, Sides, Drinks, Desserts, Deals, or any custom category).',
  schema: z.object({
    category: z.string().optional().describe('Optional category filter (e.g., "Burgers", "Sides", "Drinks", "Desserts", "Deals", etc.)'),
  }),
  func: async ({ category }: { category?: string }) => {
    try {
      const currencySymbol = await getCurrencySymbol();
      const items = await getMenuItems(restaurantId, {
        category,
        availableOnly: true,
      });

      const formatted = items.map((i: MenuItem) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        price: i.price,
        description: i.description,
      }));

      return {
        status: 'success',
        currency: currencySymbol,
        itemCount: formatted.length,
        menu: formatted,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to retrieve menu: ${err.message}`,
      };
    }
  },
});

// 2. Tool: checkItemAvailability
const checkItemAvailabilityTool = new DynamicStructuredTool({
  name: 'check_item_availability',
  description: 'Checks if a specific food or drink item is currently in stock and available to order, or provides recommendations if unavailable.',
  schema: z.object({
    item_name: z.string().describe('The name of the menu item to check (e.g., "Classic Cheeseburger", "Jalapeño Fire Burger")'),
  }),
  func: async ({ item_name }: { item_name: string }) => {
    try {
      const allItems = await getMenuItems(restaurantId);
      const match = allItems.find(
        (i: MenuItem) => i.name.toLowerCase().includes(item_name.toLowerCase()) || item_name.toLowerCase().includes(i.name.toLowerCase())
      );

      if (!match) {
        // Suggest available items from same likely category
        const availableItems = allItems.filter((i: MenuItem) => i.is_available === 1);
        const suggestions = availableItems.slice(0, 3).map((i: MenuItem) => `${i.name} ($${i.price.toFixed(2)})`);
        return {
          status: 'not_found',
          message: `Item "${item_name}" is not on our menu.`,
          suggestions,
        };
      }

      if (match.is_available === 0) {
        // Find alternative items in the same category
        const alternatives = allItems
          .filter((i: MenuItem) => i.category === match.category && i.is_available === 1 && i.id !== match.id)
          .slice(0, 3)
          .map((i: MenuItem) => `${i.name} ($${i.price.toFixed(2)})`);

        return {
          status: 'unavailable',
          item_name: match.name,
          category: match.category,
          message: `We are so sorry, "${match.name}" is currently sold out today.`,
          recommended_alternatives: alternatives,
        };
      }

      return {
        status: 'available',
        id: match.id,
        item_name: match.name,
        price: match.price,
        category: match.category,
        description: match.description,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Error checking availability: ${err.message}`,
      };
    }
  },
});

// 3. Tool: calculateOrderTotal
const calculateOrderTotalTool = new DynamicStructuredTool({
  name: 'calculate_order_total',
  description: 'Calculates the itemized subtotal, taxes, and total price for a given list of order items.',
  schema: z.object({
    items: z.array(
      z.object({
        item_name: z.string().describe('Name of the menu item'),
        quantity: z.number().int().describe('Quantity of the item'),
        customizations: z.string().optional().describe('Special instructions or customizations'),
      })
    ).describe('List of items in the customer order'),
  }),
  func: async ({ items }: { items: Array<{ item_name: string; quantity: number; customizations?: string }> }) => {
    try {
      const currencySymbol = await getCurrencySymbol();
      const allMenu = await getMenuItems(restaurantId);
      const itemized: Array<{
        menu_item_id: string | null;
        item_name: string;
        quantity: number;
        unit_price: number;
        customizations: string | null;
        total_price: number;
        is_available: boolean;
      }> = [];

      let subtotal = 0;
      const unavailable: string[] = [];

      for (const reqItem of items) {
        const menuItem = allMenu.find(
          (m: MenuItem) => m.name.toLowerCase().includes(reqItem.item_name.toLowerCase()) || reqItem.item_name.toLowerCase().includes(m.name.toLowerCase())
        );

        if (!menuItem) {
          unavailable.push(reqItem.item_name);
          continue;
        }

        if (menuItem.is_available === 0) {
          unavailable.push(`${menuItem.name} (Sold Out)`);
          continue;
        }

        const lineTotal = Number((menuItem.price * reqItem.quantity).toFixed(2));
        subtotal += lineTotal;

        itemized.push({
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          quantity: reqItem.quantity,
          unit_price: menuItem.price,
          customizations: reqItem.customizations ?? null,
          total_price: lineTotal,
          is_available: true,
        });
      }

      return {
        status: unavailable.length === 0 ? 'success' : 'partial_unavailable',
        items: itemized,
        subtotal: Number(subtotal.toFixed(2)),
        total_amount: Number(subtotal.toFixed(2)),
        currency: currencySymbol,
        unavailable_items: unavailable,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to calculate order total: ${err.message}`,
      };
    }
  },
});

// 4. Tool: searchKnowledgeBase
const searchKnowledgeBaseTool = new DynamicStructuredTool({
  name: 'search_knowledge_base',
  description: 'Searches the restaurant knowledge base for answers regarding operating hours, delivery coverage & charges, online bank payment details, refund policy, halal status, allergens, or FAQs.',
  schema: z.object({
    topic: z.string().optional().describe('Keyword or topic to search (e.g. "payment", "bank", "timings", "hours", "delivery", "halal", "allergy")'),
  }),
  func: async ({ topic }: { topic?: string }) => {
    try {
      const items = await getKnowledgeBaseItems(restaurantId, { activeOnly: true });
      if (!items || items.length === 0) {
        return {
          status: 'empty',
          message: 'No specific knowledge base entries found for this restaurant.',
        };
      }

      if (!topic || topic.trim().length === 0) {
        return {
          status: 'success',
          entries: items.map((it) => ({
            title: it.title,
            category: it.category,
            content: it.content,
          })),
        };
      }

      const q = topic.toLowerCase().trim();
      const matched = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.content.toLowerCase().includes(q)
      );

      return {
        status: 'success',
        matched_count: matched.length,
        entries: (matched.length > 0 ? matched : items).map((it) => ({
          title: it.title,
          category: it.category,
          content: it.content,
        })),
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to search knowledge base: ${err.message}`,
      };
    }
  },
});

// 5. Tool: saveOrder (with Idempotency Protection & Payment Method)
const saveOrderTool = new DynamicStructuredTool({
  name: 'save_order',
  description: 'Persists the confirmed restaurant order into the database once the customer explicitly approves the final order details, provides delivery address, and selects payment method (Cash on Delivery or Online Payment).',
  schema: z.object({
    customer_phone: z.string().describe('The customer WhatsApp phone number (e.g., "+923284119134")'),
    customer_name: z.string().optional().describe('Customer full name if provided'),
    delivery_address: z.string().describe('Customer delivery address or "Pickup"'),
    payment_method: z.enum(['Cash on Delivery', 'Online Payment']).default('Cash on Delivery').describe('Chosen payment method: "Cash on Delivery" or "Online Payment"'),
    notes: z.string().optional().describe('Special preparation or delivery instructions'),
    idempotency_key: z.string().describe('Unique idempotency key per order attempt to prevent duplicate orders'),
    items: z.array(
      z.object({
        item_name: z.string().describe('Name of the menu item'),
        quantity: z.number().int().describe('Quantity of the item'),
        unit_price: z.number().describe('Price per unit in currency'),
        customizations: z.string().optional().describe('Item customizations'),
      })
    ).describe('List of confirmed items in the order'),
    total_amount: z.number().describe('Total calculated amount'),
  }),
  func: async ({
    customer_phone,
    customer_name,
    delivery_address,
    payment_method,
    notes,
    idempotency_key,
    items,
    total_amount,
  }: {
    customer_phone: string;
    customer_name?: string;
    delivery_address: string;
    payment_method?: 'Cash on Delivery' | 'Online Payment';
    notes?: string;
    idempotency_key: string;
    items: Array<{ item_name: string; quantity: number; unit_price: number; customizations?: string }>;
    total_amount: number;
  }) => {
    try {
      // 1. Get or create customer with uniqueness constraint
      const currencySymbol = await getCurrencySymbol();
      const customer = await getOrCreateCustomer(
        restaurantId,
        customer_phone,
        customer_name ?? null,
        delivery_address
      );

      // 2. Fetch menu items for ID reference
      const menuItems = await getMenuItems(restaurantId);

      const orderItems = items.map((it) => {
        const matched = menuItems.find(
          (m: MenuItem) => m.name.toLowerCase().includes(it.item_name.toLowerCase()) || it.item_name.toLowerCase().includes(m.name.toLowerCase())
        );
        const lineTotal = Number((it.unit_price * it.quantity).toFixed(2));
        return {
          menu_item_id: matched?.id ?? null,
          item_name: matched?.name ?? it.item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          customizations: it.customizations ?? null,
          total_price: lineTotal,
        };
      });

      const chosenPayment = payment_method || 'Cash on Delivery';

      // 3. Create order with idempotency check
      const order = await createOrder({
        restaurant_id: restaurantId,
        customer_id: customer.id,
        status: 'confirmed',
        total_amount,
        delivery_address,
        payment_method: chosenPayment,
        notes: notes ?? null,
        idempotency_key,
        items: orderItems,
      });

      return {
        status: 'success',
        order_id: order.id,
        payment_method: chosenPayment,
        message: `Order #${order.id} confirmed successfully! Total: ${currencySymbol} ${order.total_amount.toFixed(2)}. Payment: ${chosenPayment}. Sent to the kitchen.`,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to save order: ${err.message}`,
      };
    }
  },
});

// 6. Tool: lookupOrder
const lookupOrderTool = new DynamicStructuredTool({
  name: 'lookup_order',
  description: 'Looks up existing order details and current status by order_id, or by customer_phone to find their most recent order.',
  schema: z.object({
    order_id: z.string().optional().describe('The order ID (e.g. ord_abc123) if known'),
    customer_phone: z.string().optional().describe('The customer phone number to search for recent orders'),
  }),
  func: async ({ order_id, customer_phone }: { order_id?: string; customer_phone?: string }) => {
    try {
      let order = null;
      if (order_id) {
        order = await getOrderById(order_id);
      } else if (customer_phone) {
        order = await getLatestOrderByCustomerPhone(restaurantId, customer_phone);
      }

      if (!order) {
        return {
          status: 'not_found',
          message: 'No active order found with the provided details.',
        };
      }

      return {
        status: 'success',
        order_id: order.id,
        current_status: order.status,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_address: order.delivery_address,
        payment_method: order.payment_method || 'Cash on Delivery',
        total_amount: order.total_amount,
        items: order.items?.map((it) => ({
          item_name: it.item_name,
          quantity: it.quantity,
          customizations: it.customizations,
          total_price: it.total_price,
        })),
        can_modify: !['completed', 'cancelled'].includes(order.status),
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to lookup order: ${err.message}`,
      };
    }
  },
});

// 7. Tool: updateOrderDetails (CRUD Update)
const updateOrderDetailsTool = new DynamicStructuredTool({
  name: 'update_order_details',
  description: 'Updates an existing order before or during preparation. Use this when the customer requests to change their delivery address/location, update their contact phone number, switch payment method (COD vs Online), or add special instructions.',
  schema: z.object({
    order_id: z.string().optional().describe('Order ID to modify. If omitted, will search customer_phone for latest order'),
    customer_phone: z.string().describe('The customer phone number'),
    delivery_address: z.string().optional().describe('New delivery address or location if customer wants to change delivery destination'),
    new_phone: z.string().optional().describe('New contact phone number if customer requests to change their phone number'),
    payment_method: z.enum(['Cash on Delivery', 'Online Payment']).optional().describe('Updated payment method if customer changes payment type'),
    notes: z.string().optional().describe('Updated delivery or preparation instructions'),
  }),
  func: async ({
    order_id,
    customer_phone,
    delivery_address,
    new_phone,
    payment_method,
    notes,
  }: {
    order_id?: string;
    customer_phone: string;
    delivery_address?: string;
    new_phone?: string;
    payment_method?: 'Cash on Delivery' | 'Online Payment';
    notes?: string;
  }) => {
    try {
      let targetOrder = null;
      if (order_id) {
        targetOrder = await getOrderById(order_id);
      } else {
        targetOrder = await getLatestOrderByCustomerPhone(restaurantId, customer_phone);
      }

      if (!targetOrder) {
        return {
          status: 'not_found',
          message: 'Could not find an active order to update for this phone number.',
        };
      }

      if (targetOrder.status === 'completed') {
        return {
          status: 'cannot_modify',
          message: `Order #${targetOrder.id} has already been completed and delivered, so its details cannot be changed. Please place a new order if needed.`,
        };
      }

      if (targetOrder.status === 'cancelled') {
        return {
          status: 'cannot_modify',
          message: `Order #${targetOrder.id} has already been cancelled.`,
        };
      }

      const updated = await updateOrderDetails({
        orderId: targetOrder.id,
        delivery_address,
        customer_phone: new_phone,
        payment_method,
        notes,
      });

      return {
        status: 'success',
        order_id: targetOrder.id,
        delivery_address: updated?.delivery_address,
        customer_phone: updated?.customer_phone,
        payment_method: updated?.payment_method,
        notes: updated?.notes,
        message: `Order #${targetOrder.id} has been updated successfully! Delivery address: "${updated?.delivery_address || 'Unchanged'}", Contact: "${updated?.customer_phone || customer_phone}", Payment: "${updated?.payment_method}". The kitchen and delivery team have been notified.`,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to update order details: ${err.message}`,
      };
    }
  },
});

// 8. Tool: cancelOrder (CRUD Delete / Cancel)
const cancelOrderTool = new DynamicStructuredTool({
  name: 'cancel_order',
  description: 'Cancels an active customer order if it has not yet been delivered.',
  schema: z.object({
    order_id: z.string().optional().describe('Order ID to cancel. If omitted, will search customer_phone for latest order'),
    customer_phone: z.string().describe('The customer phone number'),
    reason: z.string().optional().describe('Optional customer reason for cancellation'),
  }),
  func: async ({ order_id, customer_phone, reason }: { order_id?: string; customer_phone: string; reason?: string }) => {
    try {
      let targetOrder = null;
      if (order_id) {
        targetOrder = await getOrderById(order_id);
      } else {
        targetOrder = await getLatestOrderByCustomerPhone(restaurantId, customer_phone);
      }

      if (!targetOrder) {
        return {
          status: 'not_found',
          message: 'No active order found to cancel.',
        };
      }

      if (targetOrder.status === 'completed') {
        return {
          status: 'cannot_cancel',
          message: `Order #${targetOrder.id} has already been completed and delivered, and cannot be cancelled.`,
        };
      }

      if (targetOrder.status === 'cancelled') {
        return {
          status: 'already_cancelled',
          message: `Order #${targetOrder.id} is already cancelled.`,
        };
      }

      await updateOrderStatus(targetOrder.id, 'cancelled');

      return {
        status: 'success',
        order_id: targetOrder.id,
        message: `Order #${targetOrder.id} has been cancelled successfully.${reason ? ` Reason noted: "${reason}".` : ''}`,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: `Failed to cancel order: ${err.message}`,
      };
    }
  },
});

  return [
    getMenuTool,
    checkItemAvailabilityTool,
    searchKnowledgeBaseTool,
    calculateOrderTotalTool,
    saveOrderTool,
    lookupOrderTool,
    updateOrderDetailsTool,
    cancelOrderTool,
  ];
}

export const orderTools = createOrderToolsForRestaurant(env.DEFAULT_RESTAURANT_ID || 'burger-joint');
