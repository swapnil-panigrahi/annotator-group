-- AlterTable
ALTER TABLE "UserSummary" ADD COLUMN     "annotationId" UUID;

-- AddForeignKey
ALTER TABLE "UserSummary" ADD CONSTRAINT "UserSummary_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
