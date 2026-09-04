import {
  upsertRestaurant,
  createMenuItem,
  getMenuItems,
  getOrCreateCustomer,
  createOrder,
  saveChatMessage,
  createUser,
  getUserByUsername,
  createKnowledgeBaseItem,
  getKnowledgeBaseItems,
} from './queries';
import { env } from './env';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Superadmin User (dineconnect / 852004)
  const superadmin = await createUser({
    id: 'usr_superadmin_01',
    username: 'dineconnect',
    password: '852004',
    role: 'superadmin',
    restaurant_id: null,
    name: 'DineConnect SaaS Owner',
  });
  console.log(`👑 Superadmin ready: ${superadmin.username} (role: ${superadmin.role})`);

  const restaurantId = env.DEFAULT_RESTAURANT_ID || 'burger-joint';

  // 2. Seed Restaurant
  const restaurant = await upsertRestaurant({
    id: restaurantId,
    name: 'The Burger Joint',
    phone: '+92 328 4119134',
    address: 'Gulberg III, Main Boulevard, Lahore',
    currency: 'PKR',
    is_active: 1,
  });
  console.log(`✅ Restaurant created: ${restaurant.name} (${restaurant.id})`);

  // 3. Seed Restaurant Manager User (burger_joint / password123)
  const restaurantUser = await createUser({
    id: 'usr_burger_owner_01',
    username: 'burger_joint',
    password: 'password123',
    role: 'restaurant',
    restaurant_id: restaurantId,
    name: 'The Burger Joint Manager',
  });
  console.log(`🏪 Restaurant User ready: ${restaurantUser.username} for ${restaurant.name}`);

  // 4. Seed Knowledge Base Items
  const existingKb = await getKnowledgeBaseItems(restaurantId);
  if (existingKb.length === 0) {
    console.log('📚 Seeding Knowledge Base items...');
    await createKnowledgeBaseItem({
      restaurant_id: restaurantId,
      title: 'Online Payment & Bank Transfer Details',
      category: 'Payment Info',
      content: 'We accept Cash on Delivery (COD) and Online Payment. For Online Payment / Bank Transfer:\n• Bank: Meezan Bank Ltd\n• Account Title: The Burger Joint Pvt\n• Account / IBAN: PK36MEZN00129847192801\n• EasyPaisa / JazzCash: 0328-4119134\nPlease transfer the total amount and share the screenshot/transaction ID in this chat once completed!',
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurantId,
      title: 'Operating Hours & Timings',
      category: 'Operating Hours',
      content: 'We are open 7 days a week from 12:00 PM (Noon) to 02:00 AM (Midnight). Last order for kitchen delivery is taken at 01:30 AM.',
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurantId,
      title: 'Delivery Coverage & Charges',
      category: 'Delivery & Charges',
      content: 'Standard delivery fee is PKR 150 across the city within 8km. Orders above PKR 2,500 qualify for FREE delivery! Standard delivery time is 35-45 minutes depending on traffic and order size.',
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurantId,
      title: 'Halal Certification & Allergen Info',
      category: 'Policies & FAQs',
      content: 'All our prime beef and chicken patties are 100% Halal certified and fresh daily. Gluten-free lettuce wraps available upon request. Sesame seeds are on regular buns; plain potato buns available.',
      is_active: 1,
    });

    await createKnowledgeBaseItem({
      restaurant_id: restaurantId,
      title: 'Pizza Sizing, Crust Options & Custom Portions',
      category: 'Menu Concepts & Sizes',
      content: 'Pizza Sizes & Pricing:\n• Small (7 inch, 4 slices) — PKR 650\n• Medium (10 inch, 6 slices) — PKR 1,250\n• Large (13 inch, 8 slices) — PKR 1,850\n• Extra Large / Party (16 inch, 12 slices) — PKR 2,400\n\nCrust Options:\n• Traditional Pan Crust (Included free)\n• Italian Thin Crust (Included free)\n• Cheese Stuffed Crust (+PKR 250)\n• Kabab Stuffed Crust (+PKR 350)\n\nCustomizations: Extra cheese +PKR 200, Extra dipping sauce (Garlic Mayo, Ranch, Spicy Peri) +PKR 80.',
      is_active: 1,
    });
  }

  // 5. Check existing menu items
  const existingMenu = await getMenuItems(restaurantId);
  if (existingMenu.length === 0) {
    console.log('🍔 Seeding menu items...');

    const menuData = [
      // Burgers
      {
        id: 'item_classic_cheese',
        name: 'Classic Cheeseburger',
        description: 'Prime beef patty, cheddar cheese, crisp lettuce, tomato, pickles, and our signature burger sauce on a brioche bun.',
        price: 12.99,
        category: 'Burgers',
        is_available: 1,
      },
      {
        id: 'item_smoky_bacon',
        name: 'Smoky Bacon Burger',
        description: 'Double smoked bacon, sharp cheddar, caramelized onions, BBQ sauce, and Angus beef.',
        price: 14.99,
        category: 'Burgers',
        is_available: 1,
      },
      {
        id: 'item_truffle_mushroom',
        name: 'Truffle Mushroom Burger',
        description: 'Swiss cheese, sautéed cremini mushrooms, truffle aioli, and baby arugula.',
        price: 16.50,
        category: 'Burgers',
        is_available: 1,
      },
      {
        id: 'item_crispy_chicken',
        name: 'Crispy Chicken Burger',
        description: 'Buttermilk fried chicken breast, house slaw, spicy mayo, and dill pickles.',
        price: 13.50,
        category: 'Burgers',
        is_available: 1,
      },
      {
        id: 'item_beyond_burger',
        name: 'Plant-Based Beyond Burger',
        description: 'Beyond Meat patty, vegan cheddar, avocado, lettuce, tomato, and herb tahini spread.',
        price: 14.00,
        category: 'Burgers',
        is_available: 1,
      },
      {
        id: 'item_jalapeno_fire',
        name: 'Jalapeño Fire Burger',
        description: 'Ghost pepper cheese, grilled jalapeños, crispy onion straws, chipotle aioli.',
        price: 15.25,
        category: 'Burgers',
        is_available: 0, // Marked unavailable for testing edge cases
      },

      // Sides
      {
        id: 'item_fries',
        name: 'Crispy French Fries',
        description: 'Golden seasoned skin-on potatoes with sea salt.',
        price: 4.50,
        category: 'Sides',
        is_available: 1,
      },
      {
        id: 'item_sweet_potato_fries',
        name: 'Sweet Potato Fries',
        description: 'Served with sweet honey mustard dip.',
        price: 5.50,
        category: 'Sides',
        is_available: 1,
      },
      {
        id: 'item_onion_rings',
        name: 'Beer-Battered Onion Rings',
        description: 'Thick cut sweet onions fried in craft beer batter.',
        price: 6.00,
        category: 'Sides',
        is_available: 1,
      },
      {
        id: 'item_loaded_cheese_fries',
        name: 'Loaded Cheese Fries',
        description: 'Fries smothered in melted cheddar, crispy bacon bits, jalapeños, and scallions.',
        price: 7.50,
        category: 'Sides',
        is_available: 1,
      },

      // Drinks
      {
        id: 'item_craft_cola',
        name: 'Craft Cola',
        description: 'Cane sugar artisan cola in a glass bottle.',
        price: 3.00,
        category: 'Drinks',
        is_available: 1,
      },
      {
        id: 'item_lemon_iced_tea',
        name: 'Fresh Lemon Iced Tea',
        description: 'House-brewed black tea with freshly squeezed lemons.',
        price: 3.50,
        category: 'Drinks',
        is_available: 1,
      },
      {
        id: 'item_vanilla_shake',
        name: 'Vanilla Bean Milkshake',
        description: 'Madagascar vanilla gelato topped with whipped cream.',
        price: 6.50,
        category: 'Drinks',
        is_available: 1,
      },
      {
        id: 'item_chocolate_shake',
        name: 'Double Dark Chocolate Shake',
        description: 'Rich Belgian chocolate shake with chocolate shavings.',
        price: 6.50,
        category: 'Drinks',
        is_available: 1,
      },
      {
        id: 'item_mineral_water',
        name: 'Sparkling Mineral Water',
        description: 'San Pellegrino 500ml.',
        price: 2.50,
        category: 'Drinks',
        is_available: 1,
      },

      // Desserts
      {
        id: 'item_chocolate_brownie',
        name: 'Warm Fudge Brownie',
        description: 'Served warm with chocolate ganache drizzle.',
        price: 6.00,
        category: 'Desserts',
        is_available: 1,
      },
      {
        id: 'item_churros',
        name: 'Cinnamon Sugar Churros',
        description: 'Crispy churro bites with salted caramel dipping sauce.',
        price: 5.50,
        category: 'Desserts',
        is_available: 1,
      },
    ];

    for (const item of menuData) {
      await createMenuItem({
        ...item,
        restaurant_id: restaurantId,
      });
    }
    console.log(`✅ Seeded ${menuData.length} menu items.`);
  }

  // 3. Seed Sample Customers & Orders if empty
  const sampleCustomer1 = await getOrCreateCustomer(
    restaurantId,
    '+15551234567',
    'Sarah Jenkins',
    '742 Evergreen Terrace, Apt 4B'
  );

  const sampleCustomer2 = await getOrCreateCustomer(
    restaurantId,
    '+15559876543',
    'Michael Chang',
    '1088 Parkview Avenue'
  );

  const sampleCustomer3 = await getOrCreateCustomer(
    restaurantId,
    '+15553332211',
    'Elena Rostova',
    '23 Ocean Blvd, Suite 12'
  );

  // Seed sample orders
  await createOrder({
    id: 'ord_sample_101',
    restaurant_id: restaurantId,
    customer_id: sampleCustomer1.id,
    status: 'confirmed',
    total_amount: 32.48,
    delivery_address: '742 Evergreen Terrace, Apt 4B',
    notes: 'Please ring the buzzer 4B.',
    idempotency_key: 'seed_key_101',
    items: [
      {
        menu_item_id: 'item_classic_cheese',
        item_name: 'Classic Cheeseburger',
        quantity: 2,
        unit_price: 12.99,
        customizations: 'Extra pickles on one',
        total_price: 25.98,
      },
      {
        menu_item_id: 'item_lemon_iced_tea',
        item_name: 'Fresh Lemon Iced Tea',
        quantity: 2,
        unit_price: 3.50,
        customizations: null,
        total_price: 7.00,
      },
    ],
  });

  await createOrder({
    id: 'ord_sample_102',
    restaurant_id: restaurantId,
    customer_id: sampleCustomer2.id,
    status: 'preparing',
    total_amount: 27.49,
    delivery_address: '1088 Parkview Avenue',
    notes: 'No onions in the burger.',
    idempotency_key: 'seed_key_102',
    items: [
      {
        menu_item_id: 'item_smoky_bacon',
        item_name: 'Smoky Bacon Burger',
        quantity: 1,
        unit_price: 14.99,
        customizations: 'No onions',
        total_price: 14.99,
      },
      {
        menu_item_id: 'item_loaded_cheese_fries',
        item_name: 'Loaded Cheese Fries',
        quantity: 1,
        unit_price: 7.50,
        customizations: null,
        total_price: 7.50,
      },
      {
        menu_item_id: 'item_craft_cola',
        item_name: 'Craft Cola',
        quantity: 1,
        unit_price: 3.00,
        customizations: null,
        total_price: 3.00,
      },
    ],
  });

  await createOrder({
    id: 'ord_sample_103',
    restaurant_id: restaurantId,
    customer_id: sampleCustomer3.id,
    status: 'completed',
    total_amount: 22.50,
    delivery_address: '23 Ocean Blvd, Suite 12',
    notes: null,
    idempotency_key: 'seed_key_103',
    items: [
      {
        menu_item_id: 'item_truffle_mushroom',
        item_name: 'Truffle Mushroom Burger',
        quantity: 1,
        unit_price: 16.50,
        customizations: null,
        total_price: 16.50,
      },
      {
        menu_item_id: 'item_chocolate_brownie',
        item_name: 'Warm Fudge Brownie',
        quantity: 1,
        unit_price: 6.00,
        customizations: null,
        total_price: 6.00,
      },
    ],
  });

  // Seed sample conversation messages
  await saveChatMessage(restaurantId, '+15551234567', 'customer', 'Hi! What burgers do you have?');
  await saveChatMessage(
    restaurantId,
    '+15551234567',
    'bot',
    'Hello! Welcome to The Burger Joint 🍔. Here are our top burgers:\n1. Classic Cheeseburger ($12.99)\n2. Smoky Bacon Burger ($14.99)\n3. Truffle Mushroom Burger ($16.50)\n4. Crispy Chicken Burger ($13.50)\n5. Plant-Based Beyond Burger ($14.00)\n\nWhat can I get started for you?'
  );
  await saveChatMessage(restaurantId, '+15551234567', 'customer', 'I would like 2 Classic Cheeseburgers and 2 Iced Teas please.');
  await saveChatMessage(
    restaurantId,
    '+15551234567',
    'bot',
    'Awesome! Here is your order summary:\n- 2x Classic Cheeseburger ($25.98)\n- 2x Fresh Lemon Iced Tea ($7.00)\nTotal: $32.48\n\nPlease reply with your delivery address to confirm!'
  );
  await saveChatMessage(restaurantId, '+15551234567', 'customer', '742 Evergreen Terrace, Apt 4B. Please confirm!');
  await saveChatMessage(
    restaurantId,
    '+15551234567',
    'bot',
    '🎉 Order confirmed! Order #ord_sample_101 has been sent to the kitchen. Total: $32.48. We are preparing it for delivery to 742 Evergreen Terrace, Apt 4B.'
  );

  console.log('✅ Database seeded successfully!');
}

// Run when executed directly
if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}
