import { ToolLoopAgent } from 'ai';

const agent = new ToolLoopAgent({
  model: 'openai/gpt-6-astra',
  tools: {},
});

console.log(Object.keys(agent));
console.log(Object.getPrototypeOf(agent));
