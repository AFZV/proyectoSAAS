import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService],
  imports: [PdfUploaderModule],
})
export class PedidosModule {}
