import { supabaseAdmin } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function clearDatabase() {
  console.log('Clearing all dummy data from Supabase database...');

  for (const table of ['chat_messages', 'order_items', 'orders', 'menu_items', 'customers', 'restaurants']) {
    const { error } = await supabaseAdmin.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }

  const authDir = path.join(process.cwd(), 'data', 'whatsapp-auth');
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }

  console.log('Database is completely clean (0 restaurants, 0 menu items, 0 orders, 0 conversations)!');
  console.log('You can now create your own restaurant, connect WhatsApp, add menu items, and place real orders.');
}

clearDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
