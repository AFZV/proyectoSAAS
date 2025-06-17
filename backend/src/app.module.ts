import { Module } from '@nestjs/common';
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

import { ComprasModule } from './compras/compras.module';
import { ReportesModule } from './reportes/reportes.module';

import { PedidosModule } from './pedidos/pedidos.module';
import { BalanceModule } from './balance/balance.module';
import { PdfUploaderModule } from './pdf-uploader/pdf-uploader.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { ResendModule } from './resend/resend.module';

@Module({
  imports: [
    PrismaModule,
    UsuarioModule,
    DashboardModule,
    EmpresaModule,
    ClientesModule,
    AuthModule,
    ClienteEmpresaModule,
    RecibosModule,
    ProductosModule,
    EstadisticasModule,
    ProveedoresModule,
    ComprasModule,
    ReportesModule,

    PedidosModule,

    BalanceModule,

    PdfUploaderModule,

    GoogleDriveModule,

    ResendModule,
  ],
  controllers: [PrismaController],
})
export class AppModule {}
