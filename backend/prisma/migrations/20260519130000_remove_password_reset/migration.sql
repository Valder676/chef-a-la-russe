-- Remove password reset fields (feature removed from the app)
DROP INDEX IF EXISTS "User_passwordResetToken_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetExpires";
