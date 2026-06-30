import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const token = process.env.CLICKUP_API_KEY || "pk_260611431_RXX3LO0WHMZS83JGWFA8RZQ1JWV7PHFJ";
  if (!token) return NextResponse.json({ error: 'Missing ClickUp config' }, { status: 500 });
  
  try {
    const { status } = await req.json();
    
    // Convert our internal column IDs back to ClickUp status text
    let clickupStatus = status;
    if (status === 'todo') clickupStatus = 'to do';
    if (status === 'inProgress') clickupStatus = 'in progress';
    if (status === 'complete') clickupStatus = 'complete';

    const res = await fetch(`https://api.clickup.com/api/v2/task/${params.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': token.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: clickupStatus })
    });
    
    if (!res.ok) {
        const errData = await res.text();
        console.error("ClickUp PUT Error:", errData);
        throw new Error(`ClickUp API returned ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const token = process.env.CLICKUP_API_KEY || "pk_260611431_RXX3LO0WHMZS83JGWFA8RZQ1JWV7PHFJ";
  if (!token) return NextResponse.json({ error: 'Missing ClickUp config' }, { status: 500 });

  try {
    const res = await fetch(`https://api.clickup.com/api/v2/task/${params.id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': token.trim(),
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
        const errData = await res.text();
        console.error("ClickUp DELETE Error:", errData);
        throw new Error(`ClickUp API returned ${res.status}`);
    }

    return NextResponse.json({ status: 'deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
