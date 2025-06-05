import { NextResponse } from 'next/server';
import { getReservations } from "@/lib/getReservationService";
import { fileURLToPath } from 'node:url';

export const maxDuration = 60;

export async function GET() {
  console.log('siema tu cron!');
  const reservations = await getReservations();
  return NextResponse.json({ ok: true, count: reservations.length });
}

console.log("--- Debugging Execution Context ---");
console.log("process.argv:", process.argv);
console.log("import.meta.url:", import.meta.url);
console.log("new URL(import.meta.url).pathname:", new URL(import.meta.url).pathname);
console.log("--- End Debugging ---");

const scriptPathFromMeta = fileURLToPath(import.meta.url);
if (process.argv[1] === scriptPathFromMeta) {
  void (async () => {
    try {
      console.log("Starting getReservations service...");
      const result = await getReservations();
      console.log("getReservations service finished successfully.");
      console.log("Result (first 5):", result.slice(0, 5));
      console.log("Total reservations processed:", result.length);
    } catch (error) {
      console.error("Error running getReservations service:", error);
      process.exit(1);
    }
  })();
}
