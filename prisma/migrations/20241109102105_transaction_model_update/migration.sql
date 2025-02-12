/*
  Warnings:

  - Added the required column `email` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maskedPan` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "maskedPan" TEXT NOT NULL;
