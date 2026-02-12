/*
  Warnings:

  - You are about to drop the column `nodeId` on the `Like` table. All the data in the column will be lost.
  - You are about to drop the column `finalNodeId` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `optionId` to the `Like` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optionId` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Like" ("createdAt", "id", "treeId", "treeVersion", "voterId") SELECT "createdAt", "id", "treeId", "treeVersion", "voterId" FROM "Like";
DROP TABLE "Like";
ALTER TABLE "new_Like" RENAME TO "Like";
CREATE UNIQUE INDEX "Like_treeId_treeVersion_optionId_voterId_key" ON "Like"("treeId", "treeVersion", "optionId", "voterId");
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vote" ("createdAt", "id", "treeId", "treeVersion", "voterId") SELECT "createdAt", "id", "treeId", "treeVersion", "voterId" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE INDEX "Vote_optionId_idx" ON "Vote"("optionId");
CREATE UNIQUE INDEX "Vote_treeId_treeVersion_voterId_key" ON "Vote"("treeId", "treeVersion", "voterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
