-- CreateTable
CREATE TABLE "UserSummary" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "summaryId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSummary_userId_summaryId_key" ON "UserSummary"("userId", "summaryId");

-- AddForeignKey
ALTER TABLE "UserSummary" ADD CONSTRAINT "UserSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSummary" ADD CONSTRAINT "UserSummary_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "TextSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
