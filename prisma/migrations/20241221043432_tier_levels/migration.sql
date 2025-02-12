/*
  Warnings:

  - A unique constraint covering the columns `[NIN]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tierId` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KYCLevel" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "NIN" TEXT,
ADD COLUMN     "kycLevel" "KYCLevel" NOT NULL DEFAULT 'TIER_1';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "dailyDebitUsed" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "dailyTransferUsed" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "tierId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WalletTier" (
    "id" TEXT NOT NULL,
    "level" "KYCLevel" NOT NULL,
    "maxBalance" DECIMAL(65,30) NOT NULL,
    "dailyDebitLimit" DECIMAL(65,30) NOT NULL,
    "dailyTransferLimit" DECIMAL(65,30) NOT NULL,
    "monthlyTransferLimit" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_NIN_key" ON "User"("NIN");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "WalletTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
