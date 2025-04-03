/*
  Warnings:

  - The values [NOVICE] on the enum `Level` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Level_new" AS ENUM ('LAYMAN', 'PREMED', 'RESEARCHER', 'EXPERT');
ALTER TABLE "TextSummary" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "TextSummary" ALTER COLUMN "level" TYPE "Level_new" USING ("level"::text::"Level_new");
ALTER TYPE "Level" RENAME TO "Level_old";
ALTER TYPE "Level_new" RENAME TO "Level";
DROP TYPE "Level_old";
ALTER TABLE "TextSummary" ALTER COLUMN "level" SET DEFAULT 'PREMED';
COMMIT;
