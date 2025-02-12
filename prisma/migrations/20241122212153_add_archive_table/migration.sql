-- CreateTable
CREATE TABLE "ArchivedTransactions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedPan" TEXT NOT NULL,
    "encryptedExp" TEXT NOT NULL,
    "maskedPan" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivedTransactions_pkey" PRIMARY KEY ("id")
);
