import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaController } from './prisma/prisma.controller';
import { UsuarioModule } from './usuario/usuario.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { EmpresaModule } from './empresa/empresa.module';
import { ClientesModule } from './clientes/clientes.module';
import { AuthModule } from './auth/auth.module';
import { ClienteEmpresaModule } from './cliente-empresa/cliente-empresa.module';

import { RecibosModule } from './recibos/recibos.module';

import { ProductosModule } from './productos/productos.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { InventarioModule } from './inventario/inventario.module';

import { ComprasModule } from './compras/compras.module';
import { ReportesModule } from './reportes/reportes.module';

import { PedidosModule } from './pedidos/pedidos.module';
import { BalanceModule } from './balance/balance.module';
import { PdfUploaderModule } from './pdf-uploader/pdf-uploader.module';
import { ResendModule } from './resend/resend.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RespaldosModule } from './respaldos/respaldos.module';
import { ImportarModule } from './importar/importar.module';
import { HetznerStorageModule } from './hetzner-storage/hetzner-storage.module';
import { FacturasProveedorModule } from './facturas-proveedor/facturas-proveedor.module';
import { PagosProveedorModule } from './pagos-proveedor/pagos-proveedor.module';
import { ClerkModule } from './clerk/clerk.module';
import { ClientesPublicModule } from './clientes-public/clientes-public.module';
import { AuthPublicModule } from './auth-public/auth-public.module';

@Module({
  imports: [
    // Rate Limiting: 10 requests por minuto por IP
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 segundos
      limit: 10,  // 10 requests máximo
    }]),
    PrismaModule,
    UsuarioModule,
    DashboardModule,
    EmpresaModule,
    ClientesModule,
    AuthModule,
    ClienteEmpresaModule,
    ClerkModule,
    ClientesPublicModule,
    AuthPublicModule,
    RecibosModule,
    ProductosModule,
    EstadisticasModule,
    ProveedoresModule,
    ComprasModule,
    InventarioModule,
    ReportesModule,
    PedidosModule,
    BalanceModule,

    PdfUploaderModule,

    ResendModule,

    CloudinaryModule,

    RespaldosModule,

    ImportarModule,
    HetznerStorageModule,
    FacturasProveedorModule,
    PagosProveedorModule,
  ],
  controllers: [PrismaController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Aplicar rate limiting globalmente
    },
  ],
})
export class AppModule { }
