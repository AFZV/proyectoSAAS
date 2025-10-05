-- CreateEnum
CREATE TYPE "EstadoFacturaProvEnum" AS ENUM ('ABIERTA', 'PARCIAL', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "MetodoPagoProvEnum" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'OTRO');

-- CreateTable
CREATE TABLE "FacturaProveedor" (
    "idFacturaProveedor" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "tasaCambio" DOUBLE PRECISION,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoFacturaProvEnum" NOT NULL DEFAULT 'ABIERTA',
    "notas" TEXT,
    "soporteUrl" TEXT,

    CONSTRAINT "FacturaProveedor_pkey" PRIMARY KEY ("idFacturaProveedor")
);

-- CreateTable
CREATE TABLE "FacturaCompra" (
    "idFacturaCompra" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,

    CONSTRAINT "FacturaCompra_pkey" PRIMARY KEY ("idFacturaCompra")
);

-- CreateTable
CREATE TABLE "DetallePagoProveedor" (
    "idDetallePagoProveedor" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION,

    CONSTRAINT "DetallePagoProveedor_pkey" PRIMARY KEY ("idDetallePagoProveedor")
);

-- CreateTable
CREATE TABLE "PagoProveedor" (
    "idPagoProveedor" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "tasaCambio" DOUBLE PRECISION,
    "metodoPago" "MetodoPagoProvEnum" NOT NULL,
    "totalPagado" DOUBLE PRECISION,
    "descripcion" TEXT,
    "comprobanteUrl" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "PagoProveedor_pkey" PRIMARY KEY ("idPagoProveedor")
);

-- CreateIndex
CREATE INDEX "FacturaProveedor_proveedorId_idx" ON "FacturaProveedor"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaProveedor_empresaId_numero_key" ON "FacturaProveedor"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "FacturaCompra_compraId_idx" ON "FacturaCompra"("compraId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaCompra_facturaId_compraId_key" ON "FacturaCompra"("facturaId", "compraId");

-- CreateIndex
CREATE INDEX "DetallePagoProveedor_pagoId_idx" ON "DetallePagoProveedor"("pagoId");

-- CreateIndex
CREATE INDEX "DetallePagoProveedor_facturaId_idx" ON "DetallePagoProveedor"("facturaId");

-- CreateIndex
CREATE INDEX "PagoProveedor_empresaId_idx" ON "PagoProveedor"("empresaId");

-- CreateIndex
CREATE INDEX "PagoProveedor_proveedorId_idx" ON "PagoProveedor"("proveedorId");

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaProveedor" ADD CONSTRAINT "FacturaProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("idProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaCompra" ADD CONSTRAINT "FacturaCompra_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaProveedor"("idFacturaProveedor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaCompra" ADD CONSTRAINT "FacturaCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compras"("idCompra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePagoProveedor" ADD CONSTRAINT "DetallePagoProveedor_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "PagoProveedor"("idPagoProveedor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePagoProveedor" ADD CONSTRAINT "DetallePagoProveedor_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaProveedor"("idFacturaProveedor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("idProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
