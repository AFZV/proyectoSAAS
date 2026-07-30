-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleOrdenCompra" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "bultos" DOUBLE PRECISION NOT NULL,
    "pesoTotal" DOUBLE PRECISION NOT NULL,
    "cubicaje" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenCompra_empresaId_idx" ON "OrdenCompra"("empresaId");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_ordenId_idx" ON "DetalleOrdenCompra"("ordenId");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_productoId_idx" ON "DetalleOrdenCompra"("productoId");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("idProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
