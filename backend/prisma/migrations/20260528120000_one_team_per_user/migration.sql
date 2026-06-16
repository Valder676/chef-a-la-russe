-- Один участник — одна команда: оставляем самую раннюю запись
DELETE FROM "TeamMember" a
USING "TeamMember" b
WHERE a."userId" = b."userId" AND a."createdAt" > b."createdAt";

CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");
