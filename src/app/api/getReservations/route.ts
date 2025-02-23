import { NextResponse } from 'next/server';
import { getReservations } from "@/lib/getReservationService";

export const maxDuration = 60;

export async function GET() {
  console.log('siema tu cron!');
  const reservations = await getReservations();
  return NextResponse.json({ ok: true, count: reservations.length });
}
