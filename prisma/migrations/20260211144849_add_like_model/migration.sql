/*
  Warnings:

  - You are about to drop the column `choice` on the `Vote` table. All the data in the column will be lost.
  - You are about to drop the column `nodeId` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `finalNodeId` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voterId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "treeVersion" TEXT NOT NULL,
    "finalNodeId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Vote" ("createdAt", "id", "treeId", "treeVersion") SELECT "createdAt", "id", "treeId", "treeVersion" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE UNIQUE INDEX "Vote_treeId_treeVersion_voterId_key" ON "Vote"("treeId", "treeVersion", "voterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Like_treeId_treeVersion_nodeId_voterId_key" ON "Like"("treeId", "treeVersion", "nodeId", "voterId");
