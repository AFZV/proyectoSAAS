-- CreateTable
CREATE TABLE "DetalleAjusteCartera" (
    "idDetalleAjuste" TEXT NOT NULL,
    "idMovimiento" TEXT,
    "idPedido" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleAjusteCartera_pkey" PRIMARY KEY ("idDetalleAjuste")
);

-- CreateIndex
CREATE INDEX "DetalleAjusteCartera_idMovimiento_idx" ON "DetalleAjusteCartera"("idMovimiento");

-- CreateIndex
CREATE INDEX "DetalleAjusteCartera_idPedido_idx" ON "DetalleAjusteCartera"("idPedido");

-- AddForeignKey
ALTER TABLE "DetalleAjusteCartera" ADD CONSTRAINT "DetalleAjusteCartera_idMovimiento_fkey" FOREIGN KEY ("idMovimiento") REFERENCES "MovimientosCartera"("idMovimientoCartera") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleAjusteCartera" ADD CONSTRAINT "DetalleAjusteCartera_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
