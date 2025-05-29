import { NextRequest, NextResponse } from 'next/server';

const dummyState = { round: 1, results: [ { matchId: 1, scoreA: 0, scoreB: 0 }, { matchId: 2, scoreA: 0, scoreB: 0 } ] };

export function GET(req: NextRequest) {
  const pw = req.headers.get('x-admin-password');
  if (pw !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  return NextResponse.json(dummyState);
}