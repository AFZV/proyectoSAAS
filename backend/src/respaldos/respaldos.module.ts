import { Module } from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { RespaldosController } from './respaldos.controller';
import { HetznerStorageModule } from 'src/hetzner-storage/hetzner-storage.module';

@Module({
  imports: [HetznerStorageModule],
  controllers: [RespaldosController],
  providers: [RespaldosService],
})
export class RespaldosModule {}
