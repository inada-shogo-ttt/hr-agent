-- CreateTable
CREATE TABLE "ReferencePosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "postingData" TEXT NOT NULL,
    "performance" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
