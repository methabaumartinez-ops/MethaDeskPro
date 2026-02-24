import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
    try {
        console.log('Sending request to OpenAI...');
        const { text } = await generateText({
            model: openai('gpt-4o'),
            prompt: 'Sag hallo auf deutsch.',
        });
        console.log('Response:', text);
    } catch (e: any) {
        console.error('Error connecting to OpenAI:', e.message);
        if (e.cause) console.error('Cause:', e.cause);
    }
}

main();
