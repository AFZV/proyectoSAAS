import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';
import { ResendModule } from 'src/resend/resend.module';
import { HetznerStorageModule } from 'src/hetzner-storage/hetzner-storage.module';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService],
  imports: [PdfUploaderModule, ResendModule, HetznerStorageModule],
})
export class PedidosModule {}
