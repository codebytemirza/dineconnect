#!/usr/bin/env tsx
// Supabase Keep-Alive Script (TypeScript version)
// Run via: npx tsx keep-alive.ts
// Or add to cron: 0 */6 * * * cd /home/ubuntu/dineconnect && npx tsx keep-alive.ts >> logs/keep-alive.log 2>&1

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function keepAlive() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Starting Supabase keep-alive...`);

  try {
    // 1. Lightweight query on a small table (restaurants)
    const { error: restaurantsError, count } = await supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (restaurantsError) {
      console.error(`[${timestamp}] ❌ Restaurants query failed:`, restaurantsError.message);
    } else {
      console.log(`[${timestamp}] ✅ Restaurants query OK (count: ${count})`);
    }

    // 2. Query subscription_payments (another small table)
    const { error: paymentsError } = await supabase
      .from('subscription_payments')
      .select('id')
      .limit(1);

    if (paymentsError) {
      console.error(`[${timestamp}] ❌ Payments query failed:`, paymentsError.message);
    } else {
      console.log(`[${timestamp}] ✅ Payments query OK`);
    }

    // 3. Auth health check (keeps GoTrue service warm)
    const { data: healthData, error: healthError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (healthError) {
      console.error(`[${timestamp}] ❌ Auth health check failed:`, healthError.message);
    } else {
      console.log(`[${timestamp}] ✅ Auth health check OK (users: ${healthData.users.length})`);
    }

    // 4. Call a simple RPC if you have one (optional)
    // const { error: rpcError } = await supabase.rpc('keep_alive');
    // if (rpcError) console.warn('RPC keep_alive not found (optional)');

    console.log(`[${timestamp}] ✅ Keep-alive complete`);
  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Keep-alive failed:`, error.message);
    process.exit(1);
  }
}

keepAlive();