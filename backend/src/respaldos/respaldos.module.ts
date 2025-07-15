import { Module } from '@nestjs/common';
import { RespaldosService } from './respaldos.service';
import { RespaldosController } from './respaldos.controller';

@Module({
  controllers: [RespaldosController],
  providers: [RespaldosService],
})
export class RespaldosModule {}
