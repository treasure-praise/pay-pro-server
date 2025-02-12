/*
  Warnings:

  - Changed the type of `type` on the `InternalAccount` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InternalAccountType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- AlterTable
ALTER TABLE "InternalAccount" DROP COLUMN "type",
ADD COLUMN     "type" "InternalAccountType" NOT NULL;
