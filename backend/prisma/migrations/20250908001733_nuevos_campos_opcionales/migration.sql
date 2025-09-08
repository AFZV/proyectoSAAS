-- AlterTable
ALTER TABLE "Compras" ADD COLUMN     "recibido" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "DetalleCompra" ADD COLUMN     "precioUnitario" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "observaciones" TEXT;
