/*
  Warnings:

  - You are about to drop the column `idEmpresa` on the `Proveedores` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Proveedores" DROP CONSTRAINT "Proveedores_idEmpresa_fkey";

-- AlterTable
ALTER TABLE "Inventario" ALTER COLUMN "stockReferenciaOinicial" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "descripcion" TEXT DEFAULT '',
ALTER COLUMN "precioVenta" DROP NOT NULL,
ALTER COLUMN "imagenUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Proveedores" DROP COLUMN "idEmpresa";

-- AlterTable
ALTER TABLE "Recibo" ADD COLUMN     "revisado" BOOLEAN DEFAULT false;
