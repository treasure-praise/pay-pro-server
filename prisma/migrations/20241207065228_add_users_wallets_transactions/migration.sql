/*
  Warnings:

  - A unique constraint covering the columns `[BVN]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountNo]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT', 'TRANSFER');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
ADD COLUMN     "type" "TransactionType" NOT NULL,
ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "BVN" TEXT,
ADD COLUMN     "accountNo" TEXT,
ADD COLUMN     "isKYCValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "walletId" TEXT;

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "debitLimit" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0.00,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_BVN_key" ON "User"("BVN");

-- CreateIndex
CREATE UNIQUE INDEX "User_accountNo_key" ON "User"("accountNo");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
