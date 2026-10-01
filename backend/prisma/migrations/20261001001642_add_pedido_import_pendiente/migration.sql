-- CreateTable
CREATE TABLE "PedidoImportPendiente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "observacionGeneral" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "pedidoId" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "PedidoImportPendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoImportPendiente_empresaId_idx" ON "PedidoImportPendiente"("empresaId");

-- CreateIndex
CREATE INDEX "PedidoImportPendiente_expiraEn_idx" ON "PedidoImportPendiente"("expiraEn");
