import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const pw = req.headers.get('x-admin-password');
  if (pw !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { round, results } = await req.json();
  console.log(`Saving round ${round}`, results);
  // TODO: save to DB
  return NextResponse.json({ success: true });
}