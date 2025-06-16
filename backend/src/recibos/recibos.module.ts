import { Module } from '@nestjs/common';
import { RecibosController } from './recibos.controller';
import { RecibosService } from './recibos.service';
//import { PdfUploaderService } from 'src/pdf-uploader/pdf-uploader.service';
import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

@Module({
  controllers: [RecibosController],
  providers: [RecibosService],
  imports: [PdfUploaderModule],
})
export class RecibosModule {}
