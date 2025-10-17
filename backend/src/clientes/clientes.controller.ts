import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  constructor(private readonly clienteService: ClienteService) { }
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

    if (!usuario) throw new UnauthorizedException('Usuario requerido');
    return this.clienteService.getClientesPorFiltro(filtro, usuario);
  }
  @Roles('admin', 'vendedor')
  @Get('all-min')
  async getAllMin(@Req() req: UsuarioRequest) {
    const usuario = req.usuario; // Inyectado por UsuarioGuard
    return await this.clienteService.getAllClientesDeEmpresa(usuario);
  }

  @Roles('admin', 'vendedor')
  @Get('getByNit/:nit')
  getByNiT(@Param('nit') nit: string, @Req() req: UsuarioRequest) {
    if (!req.usuario) throw new UnauthorizedException('Usuario requerido');
    const usuario = req.usuario;
    return this.clienteService.getClientePorNit(nit, usuario);
  }
  @Roles('admin', 'vendedor')
  @Patch(':idCliente')
  async actualizarCliente(
    @Param('idCliente') idCliente: string,
    @Body() data: UpdateClienteDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    return await this.clienteService.actualizarCliente(
      data,
      idCliente,
      usuario
    );
  }

  @Roles('vendedor', 'admin')
  @Get('vendedores')
  async getVendedores(@Req() req: UsuarioRequest) {
    if (!req.usuario) throw new UnauthorizedException('Usuario requerido');
    const usuario = req.usuario;
    return await this.clienteService.getVendedoresPorEmpresa(usuario);
  }
}

// Controlador separado para endpoints públicos (sin autenticación)
@Controller('clientes/public')
export class ClientePublicController {
  constructor(private readonly clienteService: ClienteService) { }

  // Historia 2: Validación por NIT (público)
  @Get('exists')
  async checkNitExists(@Query('nit') nit: string) {
    if (!nit) {
      throw new BadRequestException('NIT es requerido');
    }

    try {
      const cliente = await this.clienteService.findByNit(nit);
      return {
        exists: !!cliente,
        cliente: cliente || null,
      };
    } catch (error) {
      return {
        exists: false,
        cliente: null,
      };
    }
  }

  // Historia 4: Alta de cliente nuevo (público)
  @Post('register')
  async registroPublico(@Body() body: CreateClienteDto) {
    // Crear cliente sin vendedor asignado (se asignará después por admin)
    return await this.clienteService.crearClientePublico(body);
  }
}
