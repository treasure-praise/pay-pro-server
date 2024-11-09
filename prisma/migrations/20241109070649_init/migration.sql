-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "encryptedPan" TEXT NOT NULL,
    "encryptedExp" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
