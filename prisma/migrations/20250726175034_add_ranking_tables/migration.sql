-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('TARGET', 'BASELINE', 'AGENETIC');

-- CreateTable
CREATE TABLE "RankingGroup" (
    "id" UUID NOT NULL,
    "pmid" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetId" UUID NOT NULL,
    "baselineId" UUID NOT NULL,
    "ageneticId" UUID NOT NULL,

    CONSTRAINT "RankingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRankingTask" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rankingGroupId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserRankingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummaryRanking" (
    "id" UUID NOT NULL,
    "userRankingTaskId" UUID NOT NULL,
    "targetRank" INTEGER NOT NULL,
    "baselineRank" INTEGER NOT NULL,
    "ageneticRank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SummaryRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRankingTask_userId_rankingGroupId_key" ON "UserRankingTask"("userId", "rankingGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SummaryRanking_userRankingTaskId_key" ON "SummaryRanking"("userRankingTaskId");

-- AddForeignKey
ALTER TABLE "RankingGroup" ADD CONSTRAINT "RankingGroup_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "TextSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingGroup" ADD CONSTRAINT "RankingGroup_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "TextSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingGroup" ADD CONSTRAINT "RankingGroup_ageneticId_fkey" FOREIGN KEY ("ageneticId") REFERENCES "TextSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankingTask" ADD CONSTRAINT "UserRankingTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankingTask" ADD CONSTRAINT "UserRankingTask_rankingGroupId_fkey" FOREIGN KEY ("rankingGroupId") REFERENCES "RankingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRanking" ADD CONSTRAINT "SummaryRanking_userRankingTaskId_fkey" FOREIGN KEY ("userRankingTaskId") REFERENCES "UserRankingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
