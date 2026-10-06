import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Key:', process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  try {
    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      prompt: 'Hello',
    });
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
