import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://github.com/gravity-claw",
        "X-Title": "Gravity Claw",
    },
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

async function testRetrieval() {
    const userId = 5816642744;
    const query = "What was in the PDF I uploaded?";
    console.log(`🧪 Testing Retrieval for userId: ${userId}, query: "${query}"`);

    try {
        console.log('1. Generating Embedding...');
        const embRes = await openai.embeddings.create({
            model: "openai/text-embedding-3-small",
            input: query,
        });
        const embedding = embRes.data[0].embedding;
        console.log(`✅ Embedding generated. Length: ${embedding.length}`);

        console.log('2. Querying Pinecone...');
        const index = pinecone.index(process.env.PINECONE_INDEX);
        const results = await index.namespace('knowledge').query({
            vector: embedding,
            topK: 5,
            filter: { userId: { "$eq": userId } },
            includeMetadata: true
        });

        console.log(`✅ Pinecone returned ${results.matches.length} matches.`);
        results.matches.forEach((m, i) => {
            console.log(`[Match ${i+1}] Score: ${m.score.toFixed(4)}, Fact: ${m.metadata.fact}`);
        });

        if (results.matches.length === 0) {
            console.log('⚠️ No matches found with the filter. Testing WITHOUT filter...');
            const noFilterResults = await index.namespace('knowledge').query({
                vector: embedding,
                topK: 5,
                includeMetadata: true
            });
            console.log(`✅ Without filter, found ${noFilterResults.matches.length} matches.`);
            noFilterResults.matches.forEach((m, i) => {
                console.log(`[Match ${i+1}] Score: ${m.score.toFixed(4)}, Fact: ${m.metadata.fact}, userId in meta: ${m.metadata.userId}`);
            });
        }
    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testRetrieval();
