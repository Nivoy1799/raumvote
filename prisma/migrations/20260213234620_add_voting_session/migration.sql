-- CreateTable
CREATE TABLE "VotingSession" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotingSession_pkey" PRIMARY KEY ("id")
);
