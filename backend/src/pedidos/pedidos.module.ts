import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ResendModule } from 'src/resend/resend.module';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService],
  imports: [PdfUploaderModule, CloudinaryModule, ResendModule],
})
export class PedidosModule {}
