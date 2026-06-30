import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "../config.js";

const pinecone = config.memoryEnabled
  ? new Pinecone({ apiKey: config.pineconeApiKey })
  : null;

/**
 * Returns the Pinecone index instance if configured.
 */
export function getPineconeIndex() {
  if (!pinecone || !config.pineconeIndex) return null;
  return pinecone.index(config.pineconeIndex);
}

/**
 * Helper to check if Pinecone memory is available.
 */
export function isMemoryEnabled(): boolean {
  return !!pinecone && !!config.pineconeIndex;
}
