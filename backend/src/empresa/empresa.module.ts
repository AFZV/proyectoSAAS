// src/empresa/empresa.module.ts
import { Module } from '@nestjs/common';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService, PrismaService],
  imports: [GoogleDriveModule],
})
export class EmpresaModule {}
