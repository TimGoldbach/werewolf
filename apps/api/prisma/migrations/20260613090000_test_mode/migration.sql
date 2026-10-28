-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "generated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "generated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_generated_idx" ON "Player"("generated");

-- CreateIndex
CREATE INDEX "Game_generated_idx" ON "Game"("generated");

