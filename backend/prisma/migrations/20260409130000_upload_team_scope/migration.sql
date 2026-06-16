-- Загрузки блюд привязаны к команде; userId — кто загрузил

ALTER TABLE "Upload" ADD COLUMN "teamId" TEXT;

UPDATE "Upload" AS u
SET "teamId" = tm."teamId"
FROM "TeamMember" AS tm
WHERE tm."userId" = u."userId";

DELETE FROM "Upload" WHERE "teamId" IS NULL;

ALTER TABLE "Upload" ALTER COLUMN "teamId" SET NOT NULL;

DROP INDEX IF EXISTS "Upload_userId_dishNumber_idx";

CREATE INDEX "Upload_teamId_dishNumber_idx" ON "Upload"("teamId", "dishNumber");

ALTER TABLE "Upload" ADD CONSTRAINT "Upload_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
