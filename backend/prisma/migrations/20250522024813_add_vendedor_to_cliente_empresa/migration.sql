/*
  Warnings:

  - Added the required column `vendedorId` to the `ClienteEmpresa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClienteEmpresa" ADD COLUMN     "vendedorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ClienteEmpresa_vendedorId_idx" ON "ClienteEmpresa"("vendedorId");
