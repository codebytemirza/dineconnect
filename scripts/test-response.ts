import '../lib/env';
import { createOrderAgentForRestaurant } from '../lib/agent/order-agent';
import { env } from '../lib/env';

async function test() {
  console.log('Model from env:', env.OPENAI_MODEL);
  const agent = await createOrderAgentForRestaurant('abdullah-k-pakwan');
  const result = await agent.invoke({
    messages: [{ role: 'user', content: 'Hi!' }],
  }, {
    configurable: { thread_id: `test_${Date.now()}` },
  });
  console.log('AGENT RESPONSE:\n', result.messages.at(-1)?.content ?? '[Empty]');
}

test().catch(console.error);
