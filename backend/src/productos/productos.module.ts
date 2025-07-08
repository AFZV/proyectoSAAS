import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

@Module({
  controllers: [ProductosController],
  providers: [ProductosService],
  imports: [AuthModule, PrismaModule, PdfUploaderModule],
})
export class ProductosModule {}
