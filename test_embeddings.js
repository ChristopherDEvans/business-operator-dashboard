import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/gravity-claw",
    "X-Title": "Gravity Claw",
  }
});

async function testEmbedding(model) {
  console.log(`🧪 Testing model: ${model}...`);
  try {
    const res = await openai.embeddings.create({
      model: model,
      input: "Hello world"
    });
    console.log(`✅ ${model} works! Dims: ${res.data[0].embedding.length}`);
    return true;
  } catch (err) {
    console.error(`❌ ${model} failed:`, err.message);
    return false;
  }
}

async function run() {
  await testEmbedding("openai/text-embedding-3-small");
  await testEmbedding("openai/text-embedding-ada-002");
  await testEmbedding("google/gemini-embedding-001");
}

run();
