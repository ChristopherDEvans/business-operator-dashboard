import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

// Setup clients
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/gravity-claw",
    "X-Title": "Gravity Claw",
  },
});

// Clients will be initialized inside the request handlers

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "openai/text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}

export async function POST(req: Request) {
  try {
    const { type, content, bulkMode, queueId } = await req.json();
    const userId = process.env.NEXT_PUBLIC_USER_ID ? parseInt(process.env.NEXT_PUBLIC_USER_ID) : 1;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const apifyClient = process.env.APIFY_API_TOKEN 
      ? new ApifyClient({ token: process.env.APIFY_API_TOKEN }) 
      : null;

    let itemsToProcess: { type: string, text: string, url?: string, title?: string, queueId?: string }[] = [];

    // 1. Handle Queue ID (Single item from queue)
    if (queueId) {
      const { data: qItem, error: qErr } = await supabase
        .from('ingestion_queue')
        .select('*')
        .eq('id', queueId)
        .single();
      
      if (qErr || !qItem) {
        return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
      }

      await supabase.from('ingestion_queue').update({ status: 'processing' }).eq('id', queueId);
      itemsToProcess.push({ type: qItem.type, text: qItem.url, queueId: qItem.id });
    } 
    // 2. Handle Direct Content
    else if (content) {
      if (bulkMode) {
        const lines = content.split('\n').filter((l: string) => l.trim().length > 0);
        for (const line of lines) {
          if (line.trim().startsWith('http')) {
            itemsToProcess.push({ type: 'url', text: line.trim() });
          } else {
            itemsToProcess.push({ type: 'note', text: line.trim() });
          }
        }
      } else {
        itemsToProcess.push({ type, text: content.trim() });
      }
    } else {
      return NextResponse.json({ error: 'Content or queueId is required.' }, { status: 400 });
    }

    let savedCount = 0;
    const errors: string[] = [];

    // Process each item
    for (const item of itemsToProcess) {
      let rawText = '';
      let title = item.type === 'url' ? item.text : 'Quick Note';
      let sourceUrl = item.type === 'url' ? item.text : undefined;

      try {
        if (item.type === 'url') {
          if (item.text.includes('youtube.com') || item.text.includes('youtu.be')) {
            const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN! });
            const run = await apifyClient.actor("akash9078/youtube-transcript-extractor").call({
              "videoUrl": item.text
            });
            const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
            
            if (items && items.length > 0 && items[0].transcript) {
              rawText = items[0].transcript as string;
              title = (items[0].title as string) || item.text;
            } else {
              throw new Error("No transcript found for this video.");
            }
          } else {
            const res = await axios.get(item.text, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(res.data);
            title = $('title').text() || item.text;
            $('script, style, nav, footer, header, aside').remove();
            rawText = $('body').text().replace(/\s+/g, ' ').trim();
          }

          if (rawText.length > 40000) rawText = rawText.slice(0, 40000);

          const prompt = `You are an intelligence extractor.
URL/Topic: ${item.text}
RAW TEXT:
${rawText}

Extract the top 5 to 10 most relevant facts or insights as a JSON array of strings. 
CRITICAL: Output ONLY the JSON array. Do not include any introductory or concluding text. 
Example: ["Found X", "Detail Y"]`;
          const completion = await openai.chat.completions.create({
            model: "anthropic/claude-3-haiku",
            messages: [{ role: "user", content: prompt }],
          });

          let responseText = completion.choices[0]?.message?.content?.trim() || '[]';
          console.log(`[Ingest] LLM Response:`, responseText);
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            responseText = jsonMatch[0];
            console.log(`[Ingest] Extracted JSON:`, responseText);
          } else {
            console.error(`[Ingest] No JSON array found in LLM response!`);
            throw new Error("Could not extract facts. AI response was not in a valid format.");
          }
          const facts: string[] = JSON.parse(responseText);
          console.log(`[Ingest] Extracted ${facts.length} facts. Processing...`);
          
          for (const fact of facts) {
            await insertMemory(userId, fact, { source: sourceUrl, type: 'ingested_knowledge', title });
            savedCount++;
          }
        } else {
          await insertMemory(userId, item.text, { type: 'quick_note' });
          savedCount++;
        }

        // Mark as completed if it came from queue
        if (item.queueId) {
          await supabase.from('ingestion_queue').update({ status: 'completed' }).eq('id', item.queueId);
        }
      } catch (e: any) {
        errors.push(`Error processing ${item.text}: ${e.message}`);
        if (item.queueId) {
          await supabase.from('ingestion_queue').update({ status: 'failed' }).eq('id', item.queueId);
        }
      }
    }

    return NextResponse.json({ success: true, savedCount, errors });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Memory Insertion Logic unifying Pinecone & Supabase
async function insertMemory(userId: number, fact: string, metadata: any) {
  // 1. Pinecone
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  const factsNamespace = index.namespace("knowledge");
  
  const embedding = await generateEmbedding(fact);
  const factId = `${userId}-fact-${Date.now()}-${Math.floor(Math.random()*1000)}`;

  console.log(`[Ingest] Upserting to index: ${process.env.PINECONE_INDEX}, namespace: knowledge, ID: ${factId}`);

  await factsNamespace.upsert({
    records: [{
      id: factId,
      values: embedding,
      metadata: { ...metadata, userId, fact, updatedAt: new Date().toISOString() }
    }]
  });

  // 2. Supabase Mirror
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.from('memories').upsert({
    id: factId,
    user_id: userId,
    fact: fact,
    metadata: metadata,
    created_at: new Date().toISOString()
  });
}
