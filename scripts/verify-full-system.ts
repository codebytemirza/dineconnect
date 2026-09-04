import {
  getUserByUsername,
  verifyPassword,
  getRestaurantCategories,
  getKnowledgeBaseItems,
  createKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
  getOrCreateCustomer,
  createOrder,
  getOrderById,
  updateOrderStatus,
  getLatestOrderByCustomerPhone,
  updateOrderDetails,
  createRestaurant,
  createUser,
  deleteRestaurantCompletely,
  getRestaurant,
} from '../lib/queries';
import { createSessionToken, verifySessionToken } from '../lib/auth';

async function runVerification() {
  console.log('🧪 Starting Full System End-to-End Verification...\n');

  // Test 1: Superadmin Login
  console.log('1️⃣ Testing Superadmin Credentials (dineconnect / 852004)...');
  const admin = await getUserByUsername('dineconnect');
  if (!admin) throw new Error('Superadmin dineconnect not found in database!');
  const adminPwValid = verifyPassword('852004', admin.password_hash);
  if (!adminPwValid) throw new Error('Superadmin password verification failed!');
  const adminToken = createSessionToken(admin);
  const adminSession = verifySessionToken(adminToken);
  if (!adminSession || adminSession.role !== 'superadmin') throw new Error('Admin session verification failed!');
  console.log('   ✅ Superadmin authenticated successfully! Role:', adminSession.role);

  // Test 2: Restaurant Manager Login
  console.log('\n2️⃣ Testing Restaurant Credentials (burger_joint / password123)...');
  const restUser = await getUserByUsername('burger_joint');
  if (!restUser) throw new Error('Restaurant user burger_joint not found!');
  const restPwValid = verifyPassword('password123', restUser.password_hash);
  if (!restPwValid) throw new Error('Restaurant password verification failed!');
  const restToken = createSessionToken(restUser);
  const restSession = verifySessionToken(restToken);
  if (!restSession || restSession.role !== 'restaurant' || restSession.restaurantId !== 'burger-joint') {
    throw new Error('Restaurant session mismatch!');
  }
  console.log('   ✅ Restaurant manager authenticated! Linked Restaurant ID:', restSession.restaurantId);

  // Test 3: Categories & Custom Category Support
  console.log('\n3️⃣ Testing Dynamic Menu Categories...');
  const categories = await getRestaurantCategories('burger-joint');
  console.log('   Categories found:', categories);
  if (!categories || categories.length === 0) throw new Error('No categories returned!');
  console.log('   ✅ Dynamic categories query verified.');

  // Test 4: Knowledge Base Integration
  console.log('\n4️⃣ Testing Knowledge Base...');
  const kbItems = await getKnowledgeBaseItems('burger-joint', { activeOnly: true });
  console.log(`   Found ${kbItems.length} active knowledge base items:`);
  kbItems.forEach((k) => console.log(`   • [${k.category}] ${k.title}`));
  if (kbItems.length === 0) throw new Error('Expected seeded knowledge base items!');
  console.log('   ✅ Knowledge base active entries verified.');

  // Test 5: Order with Payment Method & Status Update
  console.log('\n5️⃣ Testing Order Creation with Payment Method & Status Flow...');
  const testCustomer = await getOrCreateCustomer('burger-joint', '+923001234567', 'Test Customer', 'DHA Phase 5');
  const testOrder = await createOrder({
    restaurant_id: 'burger-joint',
    customer_id: testCustomer.id,
    total_amount: 3500,
    delivery_address: 'DHA Phase 5, Lahore',
    payment_method: 'Online Payment',
    idempotency_key: `test_order_${Date.now()}`,
    items: [
      {
        item_name: 'Classic Cheeseburger',
        quantity: 2,
        unit_price: 1500,
        total_price: 3000,
      },
      {
        item_name: 'Craft Cola',
        quantity: 1,
        unit_price: 500,
        total_price: 500,
      },
    ],
  });

  const fetched = await getOrderById(testOrder.id);
  if (!fetched || fetched.payment_method !== 'Online Payment') {
    throw new Error(`Order payment_method failed! Got: ${fetched?.payment_method}`);
  }
  console.log(`   ✅ Order created with payment_method: "${fetched.payment_method}"`);

  // Test 5B: Look up latest order by customer phone
  const lookedUp = await getLatestOrderByCustomerPhone('burger-joint', '+923001234567');
  if (!lookedUp || lookedUp.id !== testOrder.id) {
    throw new Error('Failed to lookup order by customer phone!');
  }
  console.log(`   ✅ Successfully found customer's latest order: #${lookedUp.id}`);

  // Test 5C: Modify order details (change address, phone, and payment method)
  const modified = await updateOrderDetails({
    orderId: testOrder.id,
    delivery_address: 'DHA Phase 6, Block C, Lahore',
    customer_phone: '+923007654321',
    payment_method: 'Cash on Delivery',
    notes: 'Please ring bell twice upon arrival',
  });
  if (
    !modified ||
    modified.delivery_address !== 'DHA Phase 6, Block C, Lahore' ||
    modified.payment_method !== 'Cash on Delivery' ||
    modified.customer_phone !== '+923007654321'
  ) {
    throw new Error('Failed to update order details!');
  }
  console.log(`   ✅ Order details updated! New Address: "${modified.delivery_address}", New Phone: "${modified.customer_phone}", New Payment: "${modified.payment_method}"`);

  // Test 5D: Order cancellation
  const cancelledOrder = await updateOrderStatus(testOrder.id, 'cancelled');
  if (cancelledOrder?.status !== 'cancelled') throw new Error('Failed to cancel order!');
  console.log(`   ✅ Order status cancelled successfully: "${cancelledOrder.status}"`);

  // Test 6: SaaS Owner Restaurant Onboarding & Complete Wipe
  console.log('\n6️⃣ Testing SaaS Owner Restaurant Onboarding & Complete Wipe...');
  const tempRestaurant = await createRestaurant({
    name: 'Temporary Test Bistro',
    phone: '+92 300 9999999',
    currency: 'PKR',
  });

  const tempUser = await createUser({
    username: 'testbistro_mgr',
    password: 'securepass123',
    role: 'restaurant',
    restaurant_id: tempRestaurant.id,
    name: 'Test Bistro Manager',
  });

  const tempKb = await createKnowledgeBaseItem({
    restaurant_id: tempRestaurant.id,
    title: 'Test Timing',
    category: 'Operating Hours',
    content: 'Open 24/7',
  });

  console.log(`   Onboarded temp restaurant: ${tempRestaurant.name} (${tempRestaurant.id}), User: ${tempUser.username}`);

  // Now perform complete wipe
  await deleteRestaurantCompletely(tempRestaurant.id);

  const checkRest = await getRestaurant(tempRestaurant.id);
  const checkUser = await getUserByUsername('testbistro_mgr');
  const checkKb = await getKnowledgeBaseItems(tempRestaurant.id);

  if (checkRest !== null || checkUser !== null || checkKb.length > 0) {
    throw new Error('Complete wipe failed! Remaining records found.');
  }
  console.log('   ✅ Complete wipe verified! Restaurant, user credentials, and knowledge base permanently purged.');

  console.log('\n🎉 ALL 6 PILLARS VERIFIED AND WORKING FLAWLESSLY!');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
