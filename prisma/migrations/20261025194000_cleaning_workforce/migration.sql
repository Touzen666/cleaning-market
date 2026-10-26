CREATE TABLE "CleaningProfile" (
 "userId" INTEGER NOT NULL PRIMARY KEY, "displayName" TEXT NOT NULL, "phone" TEXT, "photo" TEXT,
 "active" BOOLEAN NOT NULL DEFAULT true, "dailyLimit" INTEGER NOT NULL DEFAULT 4 CHECK ("dailyLimit" BETWEEN 1 AND 4),
 "rules" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CleaningProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CleaningUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "CleaningWorkspace" ("id" TEXT NOT NULL PRIMARY KEY, "revision" INTEGER NOT NULL DEFAULT 0, "state" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "CleaningAsset" ("id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "userId" INTEGER NOT NULL, "category" TEXT NOT NULL, "data" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "CleaningAsset_workspaceId_taskId_idx" ON "CleaningAsset"("workspaceId", "taskId");
CREATE TABLE "CleaningAuditEvent" ("id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL, "taskId" TEXT, "actor" TEXT NOT NULL, "kind" TEXT NOT NULL, "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "CleaningAuditEvent_workspaceId_createdAt_idx" ON "CleaningAuditEvent"("workspaceId", "createdAt");
CREATE TABLE "CleaningNotification" ("id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "userId" INTEGER NOT NULL, "dedupeKey" TEXT NOT NULL, "phone" TEXT, "status" TEXT NOT NULL DEFAULT 'QUEUED', "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "CleaningNotification_dedupeKey_key" ON "CleaningNotification"("dedupeKey");
CREATE INDEX "CleaningNotification_workspaceId_status_idx" ON "CleaningNotification"("workspaceId", "status");
