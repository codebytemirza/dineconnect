import { createOrderAgentForRestaurant } from './order-agent';
import { getOrders } from '../queries';
import { env } from '../env';

const threadId = `test_${Date.now()}`;

async function runTurn(userMessage: string): Promise<string> {
  const orderAgent = await createOrderAgentForRestaurant(env.DEFAULT_RESTAURANT_ID || 'burger-joint');
  const result = await orderAgent.invoke(
    { messages: [{ role: 'user', content: userMessage }] },
    { configurable: { thread_id: threadId } },
  );
  const lastMessage = result.messages.at(-1);
  return typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : Array.isArray(lastMessage?.content)
      ? lastMessage.content
        .filter((block): block is { type: 'text'; text: string } => typeof block === 'object' && block !== null && block.type === 'text')
        .map((block) => block.text)
        .join('')
      : '';
}

async function main() {
  console.log('Starting LangChain Order Agent Isolation Test...');
  console.log(`Using OpenAI model: ${env.OPENAI_MODEL}`);

  await runTurn('Hello, what burgers and sides do you have?');
  await runTurn('Can I order 1 Jalapeño Fire Burger please?');
  await runTurn('Oh okay, then 1 Smoky Bacon Burger and 1 Crispy French Fries.');
  await runTurn('Actually, please make it 2 Smoky Bacon Burgers, and add 1 Double Dark Chocolate Shake.');
  await runTurn('My delivery address is 500 Broadway Apt 12. Yes, please place the order!');

  const orders = await getOrders('burger-joint');
  const latestOrder = orders[0];
  console.log(`Latest Order ID: ${latestOrder?.id}, Total: ${latestOrder?.total_amount}`);
  console.log('LangChain agent test completed successfully.');
}

main().catch((error) => {
  console.error('LangChain agent test failed:', error);
  process.exit(1);
});
