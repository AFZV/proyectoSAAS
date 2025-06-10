/*
  Warnings:

  - You are about to drop the column `categoria` on the `Producto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "rasonZocial" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "categoria",
ADD COLUMN     "categoriaId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CategoriasProducto" (
    "idCategoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "CategoriasProducto_pkey" PRIMARY KEY ("idCategoria")
);

-- CreateTable
CREATE TABLE "ProveedorEmpresa" (
    "idProveedorEmpresa" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,

    CONSTRAINT "ProveedorEmpresa_pkey" PRIMARY KEY ("idProveedorEmpresa")
);

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriasProducto"("idCategoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorEmpresa" ADD CONSTRAINT "ProveedorEmpresa_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("idProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;
