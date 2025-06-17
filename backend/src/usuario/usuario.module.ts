import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

@Module({
  controllers: [UsuarioController],
  providers: [UsuarioService],
  imports: [GoogleDriveModule],
})
export class UsuarioModule {}
