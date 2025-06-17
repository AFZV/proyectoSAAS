-- AlterTable
ALTER TABLE "CategoriasProducto" ADD COLUMN     "empresaId" TEXT;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "flete" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "guiaTransporte" TEXT;

-- AddForeignKey
ALTER TABLE "CategoriasProducto" ADD CONSTRAINT "CategoriasProducto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
