import { supabaseAdmin } from '../lib/db';

async function main() {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) throw error;

  const msgs = data || [];
  console.log('Total messages fetched:', msgs.length);
  console.log(JSON.stringify(msgs, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
