/*
  Warnings:

  - You are about to drop the column `tipoMovimientoOrigen` on the `MovimientoInventario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MovimientoInventario" DROP COLUMN "tipoMovimientoOrigen";

-- AlterTable
ALTER TABLE "MovimientosCartera" ADD COLUMN     "tipoMovimientoOrigen" "OrigenMovimientoEnum";
