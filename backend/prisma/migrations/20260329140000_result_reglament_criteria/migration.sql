-- Регламент Chef a la Russe: 7 критериев на блюдо, макс. 100 баллов
ALTER TABLE "Result" RENAME COLUMN "taste" TO "tasteTexture";
ALTER TABLE "Result" RENAME COLUMN "hygiene" TO "hygieneWaste";
ALTER TABLE "Result" RENAME COLUMN "workSkills" TO "professionalPrep";

ALTER TABLE "Result" ADD COLUMN "innovation" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Result" ADD COLUMN "service" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "ViolationPhoto" SET "criterionKey" = 'tasteTexture' WHERE "criterionKey" = 'taste';
UPDATE "ViolationPhoto" SET "criterionKey" = 'hygieneWaste' WHERE "criterionKey" = 'hygiene';
UPDATE "ViolationPhoto" SET "criterionKey" = 'professionalPrep' WHERE "criterionKey" = 'workSkills';

-- Старые листы могли иметь презентацию до 15; по новому регламенту макс. 10
UPDATE "Result" SET "presentation" = LEAST("presentation", 10);
