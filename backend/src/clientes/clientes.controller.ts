import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { UpdateClienteDto } from './dto/update-cliente.dto';
@UseGuards(UsuarioGuard, RolesGuard)
@Controller('clientes')
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}
  @Roles('admin', 'vendedor')
  @Post()
  async crearCliente(
    @Body() body: CreateClienteDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    return await this.clienteService.crearCliente(body, usuario);
  }
  @Roles('admin', 'vendedor')
  @Get()
  async obtenerClientes(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;

    return await this.clienteService.getClientesPorUsuario(usuario);
  }
  @Roles('admin', 'vendedor')
  @Get('summary')
  async resume(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.clienteService.getResumeCard(usuario);
  }

  @Roles('admin', 'vendedor')
  @Get('getByFilter/:filtro')
  async getClientePorNit(
    @Param('filtro') filtro: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    console.log('nit recibido en backend:', filtro);
    if (!usuario) throw new UnauthorizedException('Usuario requerido');
    return this.clienteService.getClientesPorFiltro(filtro, usuario);
  }

  @Roles('admin', 'vendedor')
  @Get('getByNit/:nit')
  getByNiT(@Param('nit') nit: string, @Req() req: UsuarioRequest) {
    console.log('nit que llega al backend:', nit);
    if (!req.usuario) throw new UnauthorizedException('Usuario requerido');
    const usuario = req.usuario;
    return this.clienteService.getClientePorNit(nit, usuario);
  }
  @Roles('admin')
  @Patch(':idCliente')
  async actualizarCliente(
    @Param('idCliente') idCliente: string,
    @Body() data: UpdateClienteDto
  ) {
    return await this.clienteService.actualizarCliente(data, idCliente);
  }
}
