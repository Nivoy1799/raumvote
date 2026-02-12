-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vote_optionId_idx" ON "Vote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_treeId_treeVersion_voterId_key" ON "Vote"("treeId", "treeVersion", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_treeId_treeVersion_optionId_voterId_key" ON "Like"("treeId", "treeVersion", "optionId", "voterId");
