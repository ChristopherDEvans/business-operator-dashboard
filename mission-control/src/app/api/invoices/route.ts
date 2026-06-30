import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const invoicesDir = path.join(process.cwd(), 'public/invoices');
    
    if (!fs.existsSync(invoicesDir)) {
      return NextResponse.json({ invoices: [] });
    }

    const files = fs.readdirSync(invoicesDir);
    const invoices = files
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const stats = fs.statSync(path.join(invoicesDir, file));
        return {
          name: file,
          url: `/invoices/${file}`,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5); // Latest 5

    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list invoices' }, { status: 500 });
  }
}
