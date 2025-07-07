import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';

import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';

@Module({
  imports: [
    // Habilita Multer con almacenamiento en memoria (necesario para Cloudinary)
    MulterModule.register({
      storage: multer.memoryStorage(),
    }),
  ],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
  controllers: [CloudinaryController],
})
export class CloudinaryModule {}
