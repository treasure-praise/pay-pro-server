/*
  Warnings:

  - You are about to drop the column `encryptedExp` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `encryptedPan` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `maskedPan` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "encryptedExp",
DROP COLUMN "encryptedPan",
DROP COLUMN "maskedPan";
