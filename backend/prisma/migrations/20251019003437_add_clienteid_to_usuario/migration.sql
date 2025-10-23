-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "clienteId" TEXT;

-- CreateIndex
CREATE INDEX "Usuario_clienteId_idx" ON "Usuario"("clienteId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
