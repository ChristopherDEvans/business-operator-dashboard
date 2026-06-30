export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.CLICKUP_API_KEY || "pk_260611431_RXX3LO0WHMZS83JGWFA8RZQ1JWV7PHFJ";
  // Using the Workspace (Team) ID instead of a singular List ID 
  const teamId = "90152038205"; 
  
  if (!token) {
    return NextResponse.json({ error: 'Missing ClickUp configuration' }, { status: 500 });
  }

  try {
    // We add include_closed to make sure the Complete column populates!
    const params = new URLSearchParams({
      subtasks: 'true',
      include_closed: 'true'
    });
    // Fetching from the entire "Gravity Claw OS" Space
    const teamId = "90152038205";
    const spaceId = "901510792459";
    const res = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task?space_ids[]=${spaceId}&${params}`, {
      headers: { Authorization: token.trim() },
      cache: 'no-store'
    });
    
    if (!res.ok) {
        throw new Error(`ClickUp API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("ClickUp Fetch Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}
