-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_categoriaId_fkey";

-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "IdPedido" TEXT,
ADD COLUMN     "idCompra" TEXT,
ADD COLUMN     "observacion" TEXT;

-- AlterTable
ALTER TABLE "MovimientosCartera" ADD COLUMN     "idPedido" TEXT,
ADD COLUMN     "idRecibo" TEXT,
ADD COLUMN     "observacion" TEXT;

-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "categoriaId" DROP NOT NULL,
ALTER COLUMN "categoriaId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriasProducto"("idCategoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_idCompra_fkey" FOREIGN KEY ("idCompra") REFERENCES "Compras"("idCompra") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_IdPedido_fkey" FOREIGN KEY ("IdPedido") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosCartera" ADD CONSTRAINT "MovimientosCartera_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosCartera" ADD CONSTRAINT "MovimientosCartera_idRecibo_fkey" FOREIGN KEY ("idRecibo") REFERENCES "Recibo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
