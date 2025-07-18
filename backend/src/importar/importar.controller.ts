import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ImportarService } from './importar.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { CreateClienteExcelDto } from './dto/create-masive-clientes.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateMasiveProductoDto } from './dto/create-masive-products.dto';
import { CreateMasiveInventariosDto } from './dto/create-masive-inventarios.dto';
@Roles('admin')
@UseGuards(UsuarioGuard, RolesGuard)
@Controller('importar')
export class ImportarController {
  constructor(private readonly importarService: ImportarService) {}

  @Post('carga-masiva/clientes')
  async cargarMasivaClientes(
    @Req() req: UsuarioRequest, // contiene el usuario y empresaId del token
    @Body() clientes: CreateClienteExcelDto[]
  ) {
    const usuario = req.usuario; // o como lo estés obteniendo
    console.log('body recibido en backend:', clientes);
    return await this.importarService.cargarMasivamenteClientes(
      usuario,
      clientes
    );
  }

  @Post('carga-masiva/productos')
  async cargaMasivaProductos(
    @Req() req: UsuarioRequest,
    @Body() productos: CreateMasiveProductoDto[]
  ) {
    if (!req.usuario)
      throw new BadRequestException('No permitido para este usuario');
    const usuario = req.usuario;
    return await this.importarService.cargarMasivaProductos(usuario, productos);
  }

  @Post('carga-masiva/inventario')
  async cargaMasivaInventarios(
    @Req() req: UsuarioRequest,
    @Body() productos: CreateMasiveInventariosDto[]
  ) {
    if (!req.usuario)
      throw new BadRequestException('No permitido para este usuario');
    const usuario = req.usuario;
    return await this.importarService.cargaMasivaInventario(usuario, productos);
  }
}
