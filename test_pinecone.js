import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX);

async function testUpsert() {
    console.log('🧪 Testing Pinecone Upsert...');
    try {
        // Test with raw array (Standard for v2+)
        await index.namespace('test-namespace').upsert([
            {
                id: 'test-1',
                values: new Array(1536).fill(0.1),
                metadata: { test: true }
            }
        ]);
        console.log('✅ Upsert with raw array works!');
    } catch (err) {
        console.error('❌ Upsert with raw array failed:', err.message);
    }

    try {
        // Test with records wrapper (Old syntax)
        await index.namespace('test-namespace').upsert({
            records: [{
                id: 'test-2',
                values: new Array(1536).fill(0.2),
                metadata: { test: true }
            }]
        });
        console.log('✅ Upsert with records wrapper works!');
    } catch (err) {
        console.error('❌ Upsert with records wrapper failed:', err.message);
    }
}

testUpsert();
