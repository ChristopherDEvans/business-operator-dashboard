import { Pinecone } from "@pinecone-database/pinecone";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.PINECONE_API_KEY;
const indexName = "gravity-claw"; // Standard name for the project

if (!apiKey) {
  console.error("❌ PINECONE_API_KEY NOT FOUND IN .env");
  process.exit(1);
}

const pc = new Pinecone({ apiKey });

async function setupIndex() {
  console.log(`🌲 Checking for index: ${indexName}...`);
  
  try {
    const existingIndexes = await pc.listIndexes();
    const exists = (existingIndexes.indexes || []).some((idx: any) => idx.name === indexName);

    if (exists) {
      console.log(`✅ Index "${indexName}" already exists.`);
    } else {
      console.log(`🚀 Creating serverless index "${indexName}"...`);
      await pc.createIndex({
        name: indexName,
        dimension: 1536,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"
          }
        }
      });
      console.log(`✅ Index creation initiated. It might take a minute to be ready.`);
    }
  } catch (error) {
    console.error("❌ Failed to setup Pinecone index:", error);
  }
}

setupIndex();
