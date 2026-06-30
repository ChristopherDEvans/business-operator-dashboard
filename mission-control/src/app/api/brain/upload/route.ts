import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';


const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/gravity-claw",
    "X-Title": "Gravity Claw",
  },
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "openai/text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = process.env.NEXT_PUBLIC_USER_ID ? parseInt(process.env.NEXT_PUBLIC_USER_ID) : 1;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = '';
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      try {
        console.log(`[Upload] Parsing PDF: ${file.name}, size: ${buffer.length} bytes`);
        const pdfParse = require('pdf-parse-fork');
        const data = await pdfParse(buffer);
        console.log(`[Upload] PDF parsed. Pages: ${data.numpages}, Text length: ${data.text?.length || 0}`);
        rawText = data.text || '';
      } catch (err: any) {
        console.error(`[Upload] pdf-parse-fork error:`, err);
        return NextResponse.json({ error: `PDF parsing failed: ${err.message}` }, { status: 500 });
      }
    } else if (['txt', 'md', 'json'].includes(extension!)) {
      rawText = buffer.toString('utf-8');
      console.log(`[Upload] Text file parsed. Name: ${file.name}, length: ${rawText.length}`);
    } else {
      return NextResponse.json({ error: `Unsupported file type: .${extension}` }, { status: 400 });
    }

    if (!rawText || rawText.trim().length < 5) { // Relaxed to 5 chars
      console.warn(`[Upload] Raw text too short or empty for ${file.name}`);
      return NextResponse.json({ error: 'File appears to be empty or unreadable. (Text extracted was too short)' }, { status: 400 });
    }

    // Truncate if too huge
    if (rawText.length > 50000) rawText = rawText.slice(0, 50000);

    // LLM Extraction
    const prompt = `You are an intelligence extractor.
Document Name: ${file.name}
RAW TEXT:
${rawText}

Extract the top 5 to 10 most relevant facts or insights as a JSON array of strings. 
CRITICAL: Output ONLY the JSON array. Do not include any introductory or concluding text. 
Example: ["The document states X", "Point Y is important"]`;

    const completion = await openai.chat.completions.create({
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "user", content: prompt }],
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '[]';
    console.log(`[Upload] LLM Response:`, responseText);
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
      console.log(`[Upload] Extracted JSON:`, responseText);
    } else {
      console.error(`[Upload] No JSON array found in LLM response!`);
      throw new Error("Could not extract facts from document. AI response was not in a valid format.");
    }
    
    const facts: string[] = JSON.parse(responseText);
    console.log(`[Upload] Extracted ${facts.length} facts. Processing...`);
    let savedCount = 0;

    const factsNamespace = pinecone.index(process.env.PINECONE_INDEX!).namespace("knowledge");
    console.log(`[Upload] Upserting to Pinecone index: ${process.env.PINECONE_INDEX}, namespace: knowledge`);

    for (const fact of facts) {
      // 1. Pinecone
      const embedding = await generateEmbedding(fact);
      const factId = `${userId}-fact-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const metadata = { source: file.name, type: 'file_upload', uploadedAt: new Date().toISOString() };
      
      console.log(`[Upload] Upserting fact ID: ${factId}, metadata.userId: ${userId}`);

      await factsNamespace.upsert({
        records: [{
          id: factId,
          values: embedding,
          metadata: { ...metadata, userId, fact }
        }]
      });

      // 2. Supabase
      await supabase.from('memories').upsert({
        id: factId,
        user_id: userId,
        fact,
        metadata,
        created_at: new Date().toISOString()
      });

      savedCount++;
    }

    return NextResponse.json({ success: true, savedCount, fileName: file.name });

  } catch (error: any) {
    console.error("Upload Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
