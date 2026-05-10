import { NextResponse, type NextRequest } from "next/server";
import { ReportStatus } from "@prisma/client";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Apartamenty z ostatnim raportem w statusie AGREEMENT_SETTLED i datą zamknięcia
 * starszą niż 30 dni trafiają do archiwum (archived = true).
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === "production" && cronSecret) {
        const auth = request.headers.get("authorization");
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const apartments = await db.apartment.findMany({
        where: { archived: false },
        select: { id: true },
    });

    const archivedIds: number[] = [];

    for (const apt of apartments) {
        const latest = await db.monthlyReport.findFirst({
            where: { apartmentId: apt.id },
            orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
            select: { status: true, agreementSettledAt: true },
        });
        if (
            latest?.status === ReportStatus.AGREEMENT_SETTLED &&
            latest.agreementSettledAt &&
            latest.agreementSettledAt <= cutoff
        ) {
            await db.apartment.update({
                where: { id: apt.id },
                data: { archived: true },
            });
            archivedIds.push(apt.id);
        }
    }

    return NextResponse.json({
        success: true,
        archivedCount: archivedIds.length,
        archivedApartmentIds: archivedIds,
        cutoffIso: cutoff.toISOString(),
    });
}
