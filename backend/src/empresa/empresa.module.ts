// src/empresa/empresa.module.ts
import { Module } from '@nestjs/common';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService],
  imports: [CloudinaryModule],
})
export class EmpresaModule {}
