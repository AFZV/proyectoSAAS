import { Module } from '@nestjs/common';
import { RecibosController } from './recibos.controller';
import { RecibosService } from './recibos.service';

import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

import { ResendModule } from 'src/resend/resend.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [RecibosController],
  providers: [RecibosService],
  imports: [PdfUploaderModule, ResendModule, CloudinaryModule],
})
export class RecibosModule {}
