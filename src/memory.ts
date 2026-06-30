import { getPineconeIndex, isMemoryEnabled as libIsMemoryEnabled } from "./lib/pinecone.js";
import { generateEmbedding } from "./lib/embeddings.js";
import { 
  saveMessageLocal, 
  getRecentHistory, 
  saveCoreFactsLocal, 
  getCoreFactsLocal,
  saveSummaryLocal,
  getSummaryLocal 
} from "./lib/db.js";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyiatnquuaoruajlwtdw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aWF0bnF1dWFvcnVhamx3dGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTE2ODAsImV4cCI6MjA4OTc4NzY4MH0.C5XYk9zbSCRbgICsn2UCSI-YZClCMbKY8xMArH_GheM';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Re-export for convenience */
export function isMemoryEnabled(): boolean {
  return libIsMemoryEnabled();
}

export interface MemoryEntry {
  id: string;
  role: string;
  content: string;
  similarity: number;
}

export interface FactEntry {
  id: string;
  fact: string;
  similarity: number;
}

/**
 * ── Save Message (3-Tier Orchestration) ──
 */
export async function saveMessage(userId: number, role: string, content: string) {
  // Tier 1: Local SQLite (Instant)
  try {
    saveMessageLocal(userId, role, content);
  } catch (err: any) {
    console.error("❌ SQLite Save failed:", err.message);
  }

  // Tier 2: Pinecone Semantic (Meaning)
  if (!isMemoryEnabled()) return;

  try {
    const embedding = await generateEmbedding(content);
    if (!embedding) return; // Skip if embedding failed (e.g. quota limit)

    const index = getPineconeIndex()!;
    const namespace = index.namespace("conversations"); // Doc: conversations

    await namespace.upsert({
      records: [{
        id: `${userId}-${Date.now()}`,
        values: embedding,
        metadata: { userId, role, content, createdAt: new Date().toISOString() }
      }]
    });
  } catch (error: any) {
    console.error(`❌ Semantic Save failed: ${error.message}`);
  }
}

/**
 * ── Search Semantic Memory (Tier 2) ──
 */
export async function searchMessages(
  userId: number,
  query: string,
  limit = 3, // Doc: Top 3
): Promise<MemoryEntry[]> {
  if (!isMemoryEnabled()) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return []; // Graceful fallback on quota error

    const index = getPineconeIndex()!;
    const namespace = index.namespace("conversations");

    const results = await namespace.query({
      vector: queryEmbedding,
      topK: limit,
      filter: { userId: { "$eq": userId } },
      includeMetadata: true
    });

    console.log(`[Memory] Semantic search returned ${results.matches?.length || 0} matches.`);
    return (results.matches || [])
      .filter(m => (m.score || 0) > 0.1) // Lowered to 0.1
      .map(m => ({
        id: m.id,
        role: (m.metadata?.role as string) || "unknown",
        content: (m.metadata?.content as string) || "",
        similarity: m.score || 0
      }));
  } catch (error: any) {
    console.error(`❌ Semantic Search failed: ${error.message}`);
    return [];
  }
}

/**
 * ── Save Fact (Tier 1 + Tier 3) ──
 */
export async function upsertFact(userId: number, fact: string, metadata: any = {}) {
  // Tier 1: Local core_memory
  const currentFacts = getCoreFactsLocal(userId);
  if (!currentFacts.includes(fact)) {
    saveCoreFactsLocal(userId, [...currentFacts, fact]);
  }

  // Tier 3: Supabase Mirroring
  try {
    const factId = `${userId}-fact-${Date.now()}`;
    await supabase.from('memories').upsert({
      id: factId,
      user_id: userId,
      fact: fact,
      metadata: metadata,
      created_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("❌ Supabase Sync failed:", err.message);
  }

  // Tier 2: Vector Knowledge Namespace
  if (isMemoryEnabled()) {
    try {
      const embedding = await generateEmbedding(fact);
      if (embedding) {
        const index = getPineconeIndex()!;
        const namespace = index.namespace("knowledge"); // Doc: knowledge
        const factId = `${userId}-fact-${Date.now()}`;
        
        await namespace.upsert({
          records: [{
            id: factId,
            values: embedding,
            metadata: { ...metadata, userId, fact, updatedAt: new Date().toISOString() }
          }]
        });
      }
    } catch (e: any) {
      console.error("❌ Vector knowledge sync failed:", e.message);
    }
  }
}

/**
 * ── Search Knowledge Base (Tier 2 - Knowledge) ──
 */
export async function searchFacts(
  userId: number,
  query: string,
  limit = 5,
): Promise<FactEntry[]> {
  if (!isMemoryEnabled()) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return []; // Graceful fallback on quota error

    const index = getPineconeIndex()!;
    const namespace = index.namespace("knowledge");

    console.log(`[Memory] Searching facts for userId: ${userId} (${typeof userId}), query: "${query.slice(0, 30)}..."`);
    const results = await namespace.query({
      vector: queryEmbedding,
      topK: limit,
      filter: { userId: { "$eq": userId } },
      includeMetadata: true
    });

    console.log(`[Memory] Pinecone returned ${results.matches?.length || 0} matches.`);
    if (results.matches?.length > 0) {
      console.log(`[Memory] Best match score: ${results.matches[0].score?.toFixed(4)}`);
    }

    console.log(`[Memory] Knowledge search returned ${results.matches?.length || 0} matches.`);
    if (results.matches?.length > 0) {
       results.matches.forEach((m, idx) => {
         console.log(`  - Match ${idx+1}: Score=${m.score?.toFixed(4)}, userId=${m.metadata?.userId}`);
       });
    }

    return (results.matches || [])
      .filter(m => (m.score || 0) > 0.1) // Lowered to 0.1
      .map(m => ({
        id: m.id,
        fact: (m.metadata?.fact as string) || "",
        similarity: m.score || 0
      }));
  } catch (error: any) {
    console.error(`❌ Knowledge Search failed: ${error.message}`);
    return [];
  }
}

/**
 * ── Get Core Profile (Tier 1 - Local) ──
 */
export async function getCoreProfile(userId: number): Promise<string[]> {
  return getCoreFactsLocal(userId);
}

/**
 * ── Get Recent Session History (Tier 1 - SQLite) ──
 */
export function getSessionHistory(userId: number, limit = 20) {
  return getRecentHistory(userId, limit);
}

/**
 * ── Compaction & Summary Logic ──
 */
export async function compactIfNecessary(userId: number, openai: any) {
  const { shouldCompact, getRecentHistory, saveSummaryLocal, pruneMessages } = await import("./lib/db.js");
  
  if (shouldCompact(userId)) {
    const history = getRecentHistory(userId, 30);
    const textToSummarize = history.map(h => `${h.role}: ${h.content}`).join("\n");
    
    // LLM Summary pass
    const res = await openai.chat.completions.create({
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "user", content: `Summarize the following conversation history concisely:\n\n${textToSummarize}` }]
    });
    
    const summary = res.choices[0].message.content;
    saveSummaryLocal(userId, summary);
    pruneMessages(userId, 5); // Keep last 5 for continuity
    return summary;
  }
  return null;
}
