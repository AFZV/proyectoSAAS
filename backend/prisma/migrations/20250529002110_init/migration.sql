-- CreateEnum
CREATE TYPE "TipoMovimientoEnum" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteEmpresa" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "ClienteEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "codigo" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioCompra" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "fechaCreado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizado" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventario" (
    "idInventario" TEXT NOT NULL,
    "idProducto" TEXT NOT NULL,
    "idEmpresa" TEXT NOT NULL,
    "stockActual" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("idInventario")
);

-- CreateTable
CREATE TABLE "DetalleCompra" (
    "idDetalleCompra" TEXT NOT NULL,
    "idCompra" TEXT NOT NULL,
    "idProducto" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleCompra_pkey" PRIMARY KEY ("idDetalleCompra")
);

-- CreateTable
CREATE TABLE "Compras" (
    "idCompra" TEXT NOT NULL,
    "idProveedor" TEXT NOT NULL,
    "FechaCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compras_pkey" PRIMARY KEY ("idCompra")
);

-- CreateTable
CREATE TABLE "Proveedores" (
    "idProveedor" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "razonsocial" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,

    CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("idProveedor")
);

-- CreateTable
CREATE TABLE "Recibo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "Fechacrecion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recibo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRecibo" (
    "idDetalleRecibo" TEXT NOT NULL,
    "idPedido" TEXT NOT NULL,
    "idRecibo" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abonado',
    "saldoPendiente" DOUBLE PRECISION,

    CONSTRAINT "DetalleRecibo_pkey" PRIMARY KEY ("idDetalleRecibo")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaActualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetallePedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaEstado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "idMovimiento" TEXT NOT NULL,
    "idEmpresa" TEXT NOT NULL,
    "idProducto" TEXT NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadMovimiendo" INTEGER NOT NULL,
    "idTipoMovimiento" TEXT NOT NULL,
    "IdUsuario" TEXT NOT NULL,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("idMovimiento")
);

-- CreateTable
CREATE TABLE "TipoMovimientos" (
    "idTipoMovimiento" TEXT NOT NULL,
    "tipo" "TipoMovimientoEnum" NOT NULL,

    CONSTRAINT "TipoMovimientos_pkey" PRIMARY KEY ("idTipoMovimiento")
);

-- CreateTable
CREATE TABLE "MovimientosCartera" (
    "idMovimientoCartera" TEXT NOT NULL,
    "idCliente" TEXT NOT NULL,
    "valorMovimiento" DOUBLE PRECISION NOT NULL,
    "idUsuario" TEXT NOT NULL,
    "fechaMovimientoCartera" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientosCartera_pkey" PRIMARY KEY ("idMovimientoCartera")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_nit_key" ON "Empresa"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigo_key" ON "Usuario"("codigo");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "Cliente_nit_idx" ON "Cliente"("nit");

-- CreateIndex
CREATE INDEX "ClienteEmpresa_empresaId_idx" ON "ClienteEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "ClienteEmpresa_usuarioId_idx" ON "ClienteEmpresa"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteEmpresa_clienteId_empresaId_key" ON "ClienteEmpresa"("clienteId", "empresaId");

-- CreateIndex
CREATE INDEX "Producto_empresaId_idx" ON "Producto"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_empresaId_key" ON "Producto"("codigo", "empresaId");

-- CreateIndex
CREATE INDEX "Inventario_idProducto_idx" ON "Inventario"("idProducto");

-- CreateIndex
CREATE INDEX "Inventario_idEmpresa_idx" ON "Inventario"("idEmpresa");

-- CreateIndex
CREATE INDEX "DetalleCompra_idCompra_idx" ON "DetalleCompra"("idCompra");

-- CreateIndex
CREATE INDEX "DetalleCompra_idProducto_idx" ON "DetalleCompra"("idProducto");

-- CreateIndex
CREATE INDEX "Compras_idProveedor_idx" ON "Compras"("idProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_identificacion_key" ON "Proveedores"("identificacion");

-- CreateIndex
CREATE INDEX "Recibo_usuarioId_idx" ON "Recibo"("usuarioId");

-- CreateIndex
CREATE INDEX "Recibo_clienteId_idx" ON "Recibo"("clienteId");

-- CreateIndex
CREATE INDEX "DetalleRecibo_idRecibo_idx" ON "DetalleRecibo"("idRecibo");

-- CreateIndex
CREATE INDEX "DetalleRecibo_idPedido_idx" ON "DetalleRecibo"("idPedido");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");

-- CreateIndex
CREATE INDEX "DetallePedido_pedidoId_idx" ON "DetallePedido"("pedidoId");

-- CreateIndex
CREATE INDEX "DetallePedido_productoId_idx" ON "DetallePedido"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetallePedido_pedidoId_productoId_key" ON "DetallePedido"("pedidoId", "productoId");

-- CreateIndex
CREATE INDEX "EstadoPedido_pedidoId_idx" ON "EstadoPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_idEmpresa_idx" ON "MovimientoInventario"("idEmpresa");

-- CreateIndex
CREATE INDEX "MovimientoInventario_idProducto_idx" ON "MovimientoInventario"("idProducto");

-- CreateIndex
CREATE INDEX "MovimientoInventario_IdUsuario_idx" ON "MovimientoInventario"("IdUsuario");

-- CreateIndex
CREATE INDEX "MovimientoInventario_idTipoMovimiento_idx" ON "MovimientoInventario"("idTipoMovimiento");

-- CreateIndex
CREATE INDEX "MovimientosCartera_idCliente_idx" ON "MovimientosCartera"("idCliente");

-- CreateIndex
CREATE INDEX "MovimientosCartera_idUsuario_idx" ON "MovimientosCartera"("idUsuario");
