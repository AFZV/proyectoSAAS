import { Module } from '@nestjs/common';
import { RecibosController } from './recibos.controller';
import { RecibosService } from './recibos.service';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { ResendModule } from 'src/resend/resend.module';

@Module({
  controllers: [RecibosController],
  providers: [RecibosService],
  imports: [PdfUploaderModule, GoogleDriveModule, ResendModule],
})
export class RecibosModule {}
