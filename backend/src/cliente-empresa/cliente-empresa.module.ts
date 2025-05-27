import { Module } from '@nestjs/common';
import { ClienteEmpresaController } from './cliente-empresa.controller';
import { ClienteEmpresaService } from './cliente-empresa.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ClienteEmpresaController],
  providers: [ClienteEmpresaService, PrismaService],
})
export class ClienteEmpresaModule {}
