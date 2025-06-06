/*
  Warnings:

  - Added the required column `idEmpresa` to the `Compras` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `MovimientosCartera` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idEmpresa` to the `Proveedores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `Recibo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Compras" ADD COLUMN     "idEmpresa" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MovimientosCartera" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Proveedores" ADD COLUMN     "idEmpresa" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Recibo" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Compras" ADD CONSTRAINT "Compras_idEmpresa_fkey" FOREIGN KEY ("idEmpresa") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedores" ADD CONSTRAINT "Proveedores_idEmpresa_fkey" FOREIGN KEY ("idEmpresa") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recibo" ADD CONSTRAINT "Recibo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosCartera" ADD CONSTRAINT "MovimientosCartera_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
