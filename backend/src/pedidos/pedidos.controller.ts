import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { CrearEstadoPedidoDto } from './dto/create-estado-pedido.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
@UseGuards(UsuarioGuard, RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Roles('admin', 'vendedor')
  @Post()
  crearPedido(@Body() data: CreatePedidoDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    console.log('empresa en controller:', usuario.empresaId);
    return this.pedidosService.crearPedido(data, usuario);
  }

  @Roles('admin')
  @Post('/estado')
  crearEstado(
    @Body() data: CrearEstadoPedidoDto,
    observaciones: UpdatePedidoDto,
  ) {
    const { estado, pedidoId } = data;
    return this.pedidosService.agregarEstado(pedidoId, estado, observaciones);
  }

  @Roles('admin', 'vendedor')
  @Get()
  obtenerPedidos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.pedidosService.obtenerPedidos(usuario);
  }

  @Roles('admin')
  @Patch(':idPedido')
  actualizarPedido(
    @Body() data: UpdatePedidoDto,
    @Req() req: UsuarioRequest,
    @Param('idPedido') idPedido: string,
  ) {
    const usuario = req.usuario;
    return this.pedidosService.actualizarPedido(idPedido, data, usuario);
  }

  @Roles('admin')
  @Get('filtro')
  filtrarPedidos(@Body() data: FilterPedidoDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.pedidosService.obtenerPedidosFiltro(data, usuario);
  }
}
