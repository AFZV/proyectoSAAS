import { Module } from '@nestjs/common';
import { ClienteController, ClientePublicController } from './clientes.controller';
import { ClienteService } from './clientes.service';

@Module({
  controllers: [ClienteController, ClientePublicController],
  providers: [ClienteService],
})
export class ClientesModule { }
