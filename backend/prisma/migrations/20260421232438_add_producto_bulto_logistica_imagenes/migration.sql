-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "cubicajePorBulto" DOUBLE PRECISION,
ADD COLUMN     "monedaCompraExterior" TEXT,
ADD COLUMN     "pesoPorBulto" DOUBLE PRECISION,
ADD COLUMN     "precioCompraExterior" DOUBLE PRECISION,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "unidadesPorBulto" INTEGER;

-- CreateTable
CREATE TABLE "ProductoImagen" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoImagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_idx" ON "ProductoImagen"("productoId");

-- CreateIndex
CREATE INDEX "ProductoImagen_productoId_orden_idx" ON "ProductoImagen"("productoId", "orden");

-- AddForeignKey
ALTER TABLE "ProductoImagen" ADD CONSTRAINT "ProductoImagen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
