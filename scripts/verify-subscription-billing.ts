import {
  createRestaurant,
  checkAndUpdateRestaurantSubscription,
  recordSubscriptionPayment,
  getSaaSRevenueStats,
  deleteRestaurantCompletely,
  Restaurant,
} from '../lib/queries';
import { updateOne } from '../lib/db';

async function verifySubscriptionSystem() {
  console.log('💳 Starting SaaS Subscription & Billing Verification...\n');

  // 1. Create a test restaurant
  const testRest = await createRestaurant({
    name: 'Subscription Test Cafe',
    phone: '+92 300 8888888',
    currency: 'PKR',
  });
  console.log(`1️⃣ Created Test Restaurant: ${testRest.name} (${testRest.id})`);

  // 2. Initial state: Fresh restaurant should have 30 days remaining and status 'paid'
  const initSub = await checkAndUpdateRestaurantSubscription(testRest.id);
  console.log(`   Initial status: "${initSub.status}", Days remaining: ${initSub.daysRemaining}, Suspended: ${initSub.isSuspended}`);
  if (initSub.status !== 'paid' || initSub.isSuspended) {
    throw new Error('Fresh restaurant should be active and paid!');
  }
  console.log('   ✅ Fresh restaurant active subscription verified.');

  // 3. Simulate 2 Days Before Due Date (Reminder Toast Phase)
  console.log('\n2️⃣ Simulating 2 Days Before Due Date (Reminder Toast)...');
  const twoDaysFromNow = new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString();
  await updateOne<Restaurant>('restaurants', testRest.id, { subscription_due_date: twoDaysFromNow });
  const dueSub = await checkAndUpdateRestaurantSubscription(testRest.id);
  console.log(`   Status: "${dueSub.status}", Days remaining: ${dueSub.daysRemaining}`);
  console.log(`   Notice for dashboard: "${dueSub.reminderNotice}"`);
  if (dueSub.status !== 'due' || !dueSub.reminderNotice?.includes('Reminder:')) {
    throw new Error('Expected status "due" with reminder notice 2 days before due date!');
  }
  console.log('   ✅ 2-day reminder notice verified.');

  // 4. Simulate Grace Period (1 Day Overdue)
  console.log('\n3️⃣ Simulating 1 Day Overdue (Grace Period Warning)...');
  const oneDayPast = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  await updateOne<Restaurant>('restaurants', testRest.id, { subscription_due_date: oneDayPast });
  const graceSub = await checkAndUpdateRestaurantSubscription(testRest.id);
  console.log(`   Status: "${graceSub.status}", Days overdue: ${graceSub.daysOverdue}, Suspended: ${graceSub.isSuspended}`);
  console.log(`   Notice: "${graceSub.reminderNotice}"`);
  if (graceSub.status !== 'overdue' || graceSub.isSuspended) {
    throw new Error('Expected status "overdue" within 2-day grace period!');
  }
  console.log('   ✅ Grace period warning verified.');

  // 5. Simulate 2+ Days Out of Date (Automated Suspension)
  console.log('\n4️⃣ Simulating >2 Days Out of Date (Automated Suspension)...');
  const threeDaysPast = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  await updateOne<Restaurant>('restaurants', testRest.id, { subscription_due_date: threeDaysPast });
  const suspendedSub = await checkAndUpdateRestaurantSubscription(testRest.id);
  console.log(`   Status: "${suspendedSub.status}", Days overdue: ${suspendedSub.daysOverdue}, Suspended: ${suspendedSub.isSuspended}`);
  console.log(`   Lock Notice: "${suspendedSub.reminderNotice}"`);
  if (suspendedSub.status !== 'suspended' || !suspendedSub.isSuspended) {
    throw new Error('Restaurant should be suspended when payment is >2 days overdue!');
  }
  console.log('   ✅ Automated session & bot suspension verified (>2 days out of date).');

  // 6. SaaS Owner Records Payment (Renew 30 Days)
  console.log('\n5️⃣ Recording Payment (SaaS Owner marks paid PKR 5,000)...');
  await recordSubscriptionPayment({
    restaurantId: testRest.id,
    amount: 5000,
    notes: 'Renewed by SaaS Owner after payment receipt',
  });
  const renewedSub = await checkAndUpdateRestaurantSubscription(testRest.id);
  console.log(`   Renewed status: "${renewedSub.status}", Suspended: ${renewedSub.isSuspended}`);
  console.log(`   Next Billing Due Date: ${renewedSub.dueDate} (~30 days from now)`);
  if (renewedSub.status !== 'paid' || renewedSub.isSuspended) {
    throw new Error('Account should be restored and paid after recording payment!');
  }
  console.log('   ✅ Payment recorded, suspension lifted, and 30-day renewal cycle active.');

  // 7. Verify SaaS Revenue Aggregation
  console.log('\n6️⃣ Verifying SaaS Revenue Aggregation...');
  const saasStats = await getSaaSRevenueStats();
  console.log(`   Total Revenue Collected: PKR ${saasStats.totalRevenue.toLocaleString()}`);
  console.log(`   MRR: PKR ${saasStats.monthlyRecurringRevenue.toLocaleString()}`);
  console.log(`   Paid count: ${saasStats.paidCount}, Due count: ${saasStats.dueCount}, Suspended count: ${saasStats.suspendedCount}`);
  if (saasStats.totalRevenue < 5000) {
    throw new Error('Expected at least 5000 in total SaaS revenue!');
  }
  console.log('   ✅ SaaS revenue stats verified.');

  // Cleanup
  await deleteRestaurantCompletely(testRest.id);
  console.log('\n🧹 Cleaned up temporary test restaurant.');
  console.log('\n🎉 ALL SAAS SUBSCRIPTION, REVENUE & SUSPENSION CRITERIA PASSED!');
}

verifySubscriptionSystem().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
