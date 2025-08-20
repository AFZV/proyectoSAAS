import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';
import { HetznerStorageModule } from 'src/hetzner-storage/hetzner-storage.module';

@Module({
  controllers: [ProductosController],
  providers: [ProductosService],
  imports: [AuthModule, PrismaModule, PdfUploaderModule, HetznerStorageModule],
})
export class ProductosModule {}
