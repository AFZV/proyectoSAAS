import { Module } from '@nestjs/common';
import { ClientesPublicController } from './clientes-public.controller';
import { ClientesPublicService } from './clientes-public.service';

@Module({
    controllers: [ClientesPublicController],
    providers: [ClientesPublicService],
    exports: [ClientesPublicService],
})
export class ClientesPublicModule { }
