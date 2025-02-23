import { NextResponse } from 'next/server';

export async function GET() {
  console.log('siema!');
  return NextResponse.json({ ok: true });
  //test
}
