import { Module } from '@nestjs/common';
import { ClienteController } from './clientes.controller';
import { ClienteService } from './clientes.service';

@Module({
  controllers: [ClienteController],
  providers: [ClienteService],
})
export class ClientesModule {}
