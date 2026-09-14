-- CreateTable
CREATE TABLE "PedidoImportUsado" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoImportUsado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoImportUsado_tokenHash_key" ON "PedidoImportUsado"("tokenHash");

-- CreateIndex
CREATE INDEX "PedidoImportUsado_empresaId_idx" ON "PedidoImportUsado"("empresaId");
