import '../lib/env';
import { createOrderAgentForRestaurant } from '../lib/agent/order-agent';

async function main() {
  const agent = await createOrderAgentForRestaurant('abdullah-k-pakwan');
  const result = await agent.invoke({
    messages: [{ role: 'user', content: 'Hi' }],
  });
  console.log(result.messages.at(-1)?.content ?? '[Empty]');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
