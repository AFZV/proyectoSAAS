import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { PdfUploaderModule } from 'src/pdf-uploader/pdf-uploader.module';

@Module({
  controllers: [ComprasController],
  providers: [ComprasService],
  imports: [PdfUploaderModule],
})
export class ComprasModule {}
