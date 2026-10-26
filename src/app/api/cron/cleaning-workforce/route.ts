import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { localNow } from "@/server/cleaning/workforce-domain";
import { synchronizeWorkforce } from "@/server/cleaning/workforce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  const providedBytes = Buffer.from(provided),
    expectedBytes = Buffer.from(expected);
  if (
    !secret ||
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const from = localNow().slice(0, 10);
    const to = new Date(Date.parse(from + "T00:00Z") + 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    const result = await synchronizeWorkforce(
      db,
      "cron:cleaning-workforce",
      from,
      to,
      true,
    );
    return NextResponse.json({
      success: true,
      ...result,
      whatsappDeliveryEnabled: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Cleaning reconciliation failed; previous state retained" },
      { status: 503 },
    );
  }
}
