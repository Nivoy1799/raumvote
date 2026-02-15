-- AlterTable
ALTER TABLE "TreeConfig" ADD COLUMN     "imageModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash-preview-image-generation',
ADD COLUMN     "imagePrompt" TEXT,
ADD COLUMN     "referenceMedia" TEXT[] DEFAULT ARRAY[]::TEXT[];
