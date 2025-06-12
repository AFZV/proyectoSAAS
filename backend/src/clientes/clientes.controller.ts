import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClienteService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
@UseGuards(UsuarioGuard, RolesGuard)
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
  @Roles('admin', 'vendedor')
  @Get(':nit')
  async getClientePorNit(
    @Param('nit') nit: string,
    @Req() req: UsuarioRequest,
  ) {
    console.log('llega al backen:', req.usuario);
    const usuario = req.usuario;
    if (!usuario) throw new UnauthorizedException('userId requerido');
    return this.clienteService.getCliente(nit, usuario);
  }
}
