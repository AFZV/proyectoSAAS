import { Module } from '@nestjs/common';
import { RecibosController } from './recibos.controller';
import { RecibosService } from './recibos.service';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

import { ResendModule } from 'src/resend/resend.module';
import { HetznerStorageModule } from 'src/hetzner-storage/hetzner-storage.module';

@Module({
  controllers: [RecibosController],
  providers: [RecibosService],
  imports: [PdfUploaderModule, ResendModule, HetznerStorageModule],
})
export class RecibosModule {}
