-- CreateTable
CREATE TABLE "Settings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "summaryWindowDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
