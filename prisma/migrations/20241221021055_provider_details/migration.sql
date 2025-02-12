/*
  Warnings:

  - Changed the type of `status` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderTransactionType" AS ENUM ('FUNDING', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('PAYSTACK');

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL;

-- CreateTable
CREATE TABLE "ProviderTransaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "email" TEXT NOT NULL,
    "type" "ProviderTransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "provider" "Provider" NOT NULL,
    "reference" TEXT,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalAccount" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTransaction_reference_key" ON "ProviderTransaction"("reference");
