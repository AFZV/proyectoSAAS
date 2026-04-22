/*
  Warnings:

  - A unique constraint covering the columns `[productoId,orden]` on the table `ProductoImagen` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductoImagen_productoId_orden_key" ON "ProductoImagen"("productoId", "orden");
