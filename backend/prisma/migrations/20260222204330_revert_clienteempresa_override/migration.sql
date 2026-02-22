/*
  Warnings:

  - You are about to drop the column `apellidos` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `ciudad` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `departamento` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `nit` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `rasonZocial` on the `ClienteEmpresa` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `ClienteEmpresa` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClienteEmpresa" DROP COLUMN "apellidos",
DROP COLUMN "ciudad",
DROP COLUMN "departamento",
DROP COLUMN "direccion",
DROP COLUMN "email",
DROP COLUMN "estado",
DROP COLUMN "nit",
DROP COLUMN "nombre",
DROP COLUMN "rasonZocial",
DROP COLUMN "telefono";
