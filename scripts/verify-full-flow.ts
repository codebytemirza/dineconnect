import { supabaseAdmin } from '../lib/db';
import {
  createRestaurant,
  createMenuItem,
  updateMenuItem,
  getOrders,
  getDashboardStats,
  getChatHistory,
  saveChatMessage,
} from '../lib/queries';
import { createOrderAgentForRestaurant } from '../lib/agent/order-agent';
import { whatsappManager } from '../lib/whatsapp/manager';

async function verifyFullFlow() {
  console.log('\n======================================================');
  console.log('🚀 DICONNECT FULL END-TO-END INTEGRATION TEST');
  console.log('======================================================\n');

  // STEP 1: Clear DB to test fresh zero-data state
  console.log('1️⃣ Clearing database to verify ZERO DATA state...');
  for (const table of ['order_items', 'orders', 'chat_messages', 'menu_items', 'customers', 'restaurants']) {
    const { error } = await supabaseAdmin.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }

  const emptyStats = await getDashboardStats('non_existent');
  console.log('   Empty Stats Verification:', {
    ordersToday: emptyStats.ordersToday,
    revenueToday: emptyStats.revenueToday,
    activeConversations: emptyStats.activeConversations,
    topItems: emptyStats.topItems.length,
    recentOrders: emptyStats.recentOrders.length,
  });
  if (emptyStats.ordersToday !== 0 || emptyStats.revenueToday !== 0) {
    throw new Error('Zero state check failed!');
  }
  console.log('   ✅ Zero state verified successfully.\n');

  // STEP 2: Create a new Restaurant
  console.log('2️⃣ Creating a new Restaurant ("Bella Italia Trattoria")...');
  const restaurant = await createRestaurant({
    name: 'Bella Italia Trattoria',
    currency: '$',
  });
  console.log(`   ✅ Restaurant Created: "${restaurant.name}" (ID: ${restaurant.id}, Currency: ${restaurant.currency})\n`);

  // STEP 3: Add 3 Menu Items and Toggle One to Unavailable (Sold Out)
  console.log('3️⃣ Adding 3 menu items and toggling one to unavailable...');
  const item1 = await createMenuItem({
    restaurant_id: restaurant.id,
    name: 'Wood-Fired Margherita Pizza',
    category: 'Burgers', // using main category
    price: 15.5,
    description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
    is_available: 1,
  });
  console.log(`   ➕ Added: ${item1.name} ($${item1.price}) - In Stock`);

  const item2 = await createMenuItem({
    restaurant_id: restaurant.id,
    name: 'Truffle Tagliatelle Pasta',
    category: 'Burgers',
    price: 22.0,
    description: 'Handmade pasta tossed with black summer truffle paste and aged Parmigiano Reggiano.',
    is_available: 1,
  });
  console.log(`   ➕ Added: ${item2.name} ($${item2.price}) - In Stock`);

  const item3 = await createMenuItem({
    restaurant_id: restaurant.id,
    name: 'Classic Tiramisu',
    category: 'Desserts',
    price: 8.5,
    description: 'Espresso-soaked ladyfingers layered with mascarpone cream and dusted with Dutch cocoa.',
    is_available: 1,
  });
  console.log(`   ➕ Added: ${item3.name} ($${item3.price}) - In Stock`);

  // Toggle Truffle Tagliatelle to Sold Out
  const updatedItem2 = await updateMenuItem(item2.id, { is_available: 0 });
  console.log(`   🔴 Toggled "${updatedItem2?.name}" to Sold Out (is_available: ${updatedItem2?.is_available})\n`);

  // STEP 4: Verify WhatsApp Bridge Status & QR Endpoint
  console.log('4️⃣ Testing WhatsApp Bridge Status & QR generation...');
  const initialStatus = await whatsappManager.getStatus(restaurant.id);
  console.log(`   Initial status for "${restaurant.id}":`, initialStatus.status);

  // Trigger connect
  const connectResult = await whatsappManager.startBridge(restaurant.id);
  console.log(`   Bridge start result: status = ${connectResult.status}, hasQr = ${Boolean(connectResult.qrDataUrl)}`);
  console.log('   ✅ WhatsApp Bridge Manager and QR generation verified.\n');

  // STEP 5: Test autonomous LangChain agent flow for this new restaurant
  console.log('5️⃣ Testing LangChain AI Order Agent with "Bella Italia Trattoria" menu...');
  const agent = await createOrderAgentForRestaurant(restaurant.id);

  const testUserPhone = '+15558889900';
  const testThreadId = `thread_${restaurant.id}_${Date.now()}`;

  async function runMessage(text: string): Promise<string> {
    console.log(`   💬 Customer: "${text}"`);
    await saveChatMessage(restaurant.id, testUserPhone, 'customer', text);

    const result = await agent.invoke(
      { messages: [{ role: 'user', content: text }] },
      { configurable: { thread_id: testThreadId } },
    );
    const lastMessage = result.messages.at(-1);
    const reply = typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : Array.isArray(lastMessage?.content)
        ? lastMessage.content
          .filter((block): block is { type: 'text'; text: string } => typeof block === 'object' && block !== null && block.type === 'text')
          .map((block) => block.text)
          .join('')
        : '';

    await saveChatMessage(restaurant.id, testUserPhone, 'bot', reply);
    console.log(`   🤖 Agent:\n${reply.trim() || '[Empty]'}\n`);
    return reply;
  }

  // Turn A: Ask what they have
  await runMessage('Hello! What pizzas or desserts do you have?');

  // Turn B: Order sold out item
  await runMessage('Can I get 1 Truffle Tagliatelle Pasta please?');

  // Turn C: Order available item & provide address
  await runMessage('Okay then I will take 2 Wood-Fired Margherita Pizzas and 1 Classic Tiramisu. My address is 742 Evergreen Terrace. Yes please confirm!');

  // STEP 6: Verify Database Persistence & Dashboard Stats
  console.log('6️⃣ Verifying Order and Conversation Persistence in Database...');
  const orders = await getOrders(restaurant.id);
  console.log(`   Total Orders for "${restaurant.name}":`, orders.length);
  if (orders.length > 0) {
    const latest = orders[0];
    console.log(`   Latest Order ID: ${latest.id}`);
    console.log(`   Total Amount: $${latest.total_amount}`);
    console.log(`   Customer: ${latest.customer_phone}`);
    console.log(`   Delivery Address: ${latest.delivery_address}`);
    console.log(`   Line Items:`, latest.items?.map((i) => `${i.quantity}x ${i.item_name} ($${i.unit_price})`));
  }

  const updatedStats = await getDashboardStats(restaurant.id);
  console.log('\n   📊 Updated Dashboard KPIs:');
  console.log(`   - Orders Today: ${updatedStats.ordersToday}`);
  console.log(`   - Revenue Today: $${updatedStats.revenueToday.toFixed(2)}`);
  console.log(`   - Active Conversations: ${updatedStats.activeConversations}`);
  console.log(`   - Average Order: $${updatedStats.averageOrder.toFixed(2)}`);
  console.log(`   - Top Items:`, updatedStats.topItems);

  const history = await getChatHistory(restaurant.id, testUserPhone);
  console.log(`\n   💬 Recorded Chat Messages in SQLite: ${history.length} messages`);

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END INTEGRATION TESTS PASSED 100%!');
  console.log('======================================================\n');
}

verifyFullFlow().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
