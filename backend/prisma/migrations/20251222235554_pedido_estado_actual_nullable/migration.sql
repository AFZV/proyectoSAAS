-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "estadoActual" TEXT,
ADD COLUMN     "fechaEstadoActual" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Pedido_empresaId_estadoActual_fechaPedido_idx" ON "Pedido"("empresaId", "estadoActual", "fechaPedido");
