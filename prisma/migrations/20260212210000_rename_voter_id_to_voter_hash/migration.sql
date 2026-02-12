-- Rename voterId to voterHash in Vote table
ALTER TABLE "Vote" RENAME COLUMN "voterId" TO "voterHash";

-- Drop old unique index and create new one
DROP INDEX "Vote_treeId_treeVersion_voterId_key";
CREATE UNIQUE INDEX "Vote_treeId_treeVersion_voterHash_key" ON "Vote"("treeId", "treeVersion", "voterHash");

-- Rename voterId to voterHash in Like table
ALTER TABLE "Like" RENAME COLUMN "voterId" TO "voterHash";

-- Drop old unique index and create new one
DROP INDEX "Like_treeId_treeVersion_optionId_voterId_key";
CREATE UNIQUE INDEX "Like_treeId_treeVersion_optionId_voterHash_key" ON "Like"("treeId", "treeVersion", "optionId", "voterHash");
