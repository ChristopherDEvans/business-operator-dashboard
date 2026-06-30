import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      console.log('📡 [Logs API] Starting log stream for Gravity Claw service...');
      
      // Execute railway logs. Newer versions require --lines before -s.
      // Use a single command string for Windows shell robustness.
      const railway = spawn('railway logs --lines 50 -s "Gravity Claw"', {
        cwd: process.cwd(),
        shell: true,
      });

      railway.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', text: line })}\n\n`));
          }
        });
      });

      railway.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', text: line })}\n\n`));
          }
        });
      });

      railway.on('close', (code) => {
        console.log(`📡 [Logs API] Log stream closed with code ${code}`);
        controller.close();
      });

      railway.on('error', (err) => {
        console.error(`📡 [Logs API] Spawn error:`, err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: `Failed to spawn railway CLI: ${err.message}` })}\n\n`));
        controller.close();
      });

      // Cleanup on client disconnect
      req.signal.onabort = () => {
        console.log('📡 [Logs API] Browser disconnected, killing railway process.');
        railway.kill();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
