-- CreateTable
CREATE TABLE "TreeNode" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "question" TEXT,
    "mediaUrl" TEXT,
    "side" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "discovererHash" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "amountVisits" INTEGER NOT NULL DEFAULT 0,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeConfig" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "rootNodeId" TEXT,
    "title" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "modelName" TEXT NOT NULL DEFAULT 'gpt-4o',
    "placeholderUrl" TEXT NOT NULL DEFAULT '/media/placeholder.jpg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeNode_treeId_idx" ON "TreeNode"("treeId");

-- CreateIndex
CREATE INDEX "TreeNode_parentId_idx" ON "TreeNode"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeNode_parentId_side_key" ON "TreeNode"("parentId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "TreeConfig_treeId_key" ON "TreeConfig"("treeId");

-- AddForeignKey
ALTER TABLE "TreeNode" ADD CONSTRAINT "TreeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TreeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
