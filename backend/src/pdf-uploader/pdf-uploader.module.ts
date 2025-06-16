// src/pdf-uploader/pdf-uploader.module.ts
import { Module } from '@nestjs/common';
import { PdfUploaderService } from './pdf-uploader.service';
import { PdfUploaderController } from './pdf-uploader.controller';

@Module({
  controllers: [PdfUploaderController],
  providers: [PdfUploaderService],
  exports: [PdfUploaderService],
})
export class PdfUploaderModule {}
