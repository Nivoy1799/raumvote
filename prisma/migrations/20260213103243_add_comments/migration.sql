-- DropIndex
DROP INDEX "Vote_optionId_idx";

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_treeId_treeVersion_optionId_createdAt_idx" ON "Comment"("treeId", "treeVersion", "optionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_commentId_voterHash_key" ON "CommentLike"("commentId", "voterHash");

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
