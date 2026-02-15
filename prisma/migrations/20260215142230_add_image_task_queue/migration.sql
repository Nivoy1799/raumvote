-- CreateTable
CREATE TABLE "ImageTask" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeTitel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "imageUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageTask_treeId_status_idx" ON "ImageTask"("treeId", "status");

-- CreateIndex
CREATE INDEX "ImageTask_nodeId_idx" ON "ImageTask"("nodeId");
