/*
  Warnings:

  - Added the required column `empresaId` to the `ProveedorEmpresa` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrigenMovimientoEnum" AS ENUM ('PEDIDO', 'RECIBO', 'AJUSTE_MANUAL');

-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "tipoMovimientoOrigen" "OrigenMovimientoEnum";

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "pdfUrl" TEXT;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "manifiestoUrl" TEXT;

-- AlterTable
ALTER TABLE "ProveedorEmpresa" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ProveedorEmpresa" ADD CONSTRAINT "ProveedorEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
