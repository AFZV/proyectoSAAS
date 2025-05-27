import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ClienteService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Get()
  async obtenerClientes(@Headers('authorization') authHeader: string) {
    console.log('llego al backend y mando bearer:', authHeader);
    if (!authHeader) {
      throw new UnauthorizedException('userId no proporcionado');
    }

    const userId = authHeader;

    return await this.clienteService.getClientesPorUsuario(userId);
  }

  @Post()
  async crearCliente(@Body() body: CreateClienteDto) {
    return await this.clienteService.crearCliente(body);
  }

  @Get(':nit')
  async getClientePorNit(
    @Param('nit') nit: string,
    @Headers('authorization') userId: string,
  ) {
    console.log('💡 Recibido userId desde header:', userId);
    if (!userId) throw new UnauthorizedException('userId requerido');
    return this.clienteService.getCliente(nit, userId);
  }
}
