import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      // Trim keys and values to handle "weight " or different naming from shortcuts
      body = Object.fromEntries(
        Array.from(params.entries()).map(([k, v]) => [k.trim(), v.trim()])
      );
    }

    console.log('--- Health API Request Received ---');
    console.log('Content-Type:', contentType);
    console.log('Trimmed Body:', body);
    
    const weight = body.weight || body.Weight || body['weight'];
    const steps = body.steps || body.Steps || body.steps_total || body.stepCount;
    const body_fat = body.body_fat || body.body_fat_percentage || body.bodyFat || body['Body Fat'];
    const dateStr = body.date || body.Date || body.timestamp || body['timestamp '];
    
    const today = new Date().toISOString().split('T')[0];
    let logDate = today;

    if (dateStr) {
      // Handle "3 Apr 2026 at 13:04" format from Apple Shortcuts
      const normalized = dateStr.replace(' at ', ' ');
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) {
        logDate = parsed.toISOString().split('T')[0];
      }
    }

    console.log('Final Data Mapping:', { weight, steps, body_fat, logDate });

    const results = [];

    // Log Weight if provided
    if (weight !== undefined) {
      const { error: wErr } = await supabase
        .from('weight_logs')
        .upsert({ date: logDate, weight: parseFloat(weight) });
      if (wErr) results.push({ metric: 'weight', status: 'error', message: wErr.message });
      else results.push({ metric: 'weight', status: 'success' });
    }

    // Log Steps if provided
    if (steps !== undefined) {
      const { error: sErr } = await supabase
        .from('steps_logs')
        .upsert({ date: logDate, count: parseInt(steps, 10) });
      if (sErr) results.push({ metric: 'steps', status: 'error', message: sErr.message });
      else results.push({ metric: 'steps', status: 'success' });
    }

    // Log Body Fat if provided
    if (body_fat !== undefined) {
      const { error: bfErr } = await supabase
        .from('body_fat_logs')
        .upsert({ date: logDate, percentage: parseFloat(body_fat) });
      if (bfErr) results.push({ metric: 'body_fat', status: 'error', message: bfErr.message });
      else results.push({ metric: 'body_fat', status: 'success' });
    }

    console.log('Results:', results);
    return NextResponse.json({ 
      message: 'Health metrics processed', 
      date: logDate,
      results 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Health API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
