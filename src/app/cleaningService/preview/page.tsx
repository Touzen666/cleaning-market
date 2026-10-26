import { notFound } from "next/navigation";
import { createCleaningPreviewFixture } from "./fixtures";
import { CleaningPreviewClient } from "./preview-client";

export const dynamic = "force-dynamic";

export default function CleaningPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CleaningPreviewClient initialData={createCleaningPreviewFixture()} />;
}
