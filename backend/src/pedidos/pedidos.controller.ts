import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
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
import { UpdateEnvioDto } from './dto/update-envio-pedido.dto';
import { Response } from 'express';
@UseGuards(UsuarioGuard, RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Roles('admin', 'vendedor', 'CLIENTE')
  @Post()
  crearPedido(@Body() data: CreatePedidoDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;

    return this.pedidosService.crearPedido(data, usuario);
  }

  @Roles('admin', 'bodega')
  @Post('estado')
  crearEstado(@Body() data: CrearEstadoPedidoDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const { estado, pedidoId, flete, guiaTransporte } = data;
    return this.pedidosService.agregarEstado(
      pedidoId,
      estado,
      usuario,
      guiaTransporte,
      flete
    );
  }

  @Roles('admin', 'vendedor', 'bodega', 'CLIENTE')
  @Get()
  obtenerPedidos(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return this.pedidosService.obtenerPedidos(usuario);
  }

  @Roles('admin', 'bodega')
  @Patch(':idPedido')
  actualizarPedido(
    @Body() data: UpdatePedidoDto,
    @Req() req: UsuarioRequest,
    @Param('idPedido') idPedido: string
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

  @Roles('admin', 'bodega')
  @Patch(':pedidoId/envio')
  async actualizarEnvio(
    @Param('pedidoId') pedidoId: string,
    @Body() data: UpdateEnvioDto, // debe contener guiaTransporte?: string|null; flete?: number|null
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario; // viene del UsuarioGuard
    const pedido = await this.pedidosService.actualizarEnvio(
      pedidoId,
      data,
      usuario
    );

    return {
      message: 'Información de envío actualizada',
      pedido,
    };
  }

  @Roles('admin')
  @Patch('comision/:pedidoId/:comisionVendedor')
  async asignarComisionVendedor(
    @Param('pedidoId') pedidoId: string,
    @Param('comisionVendedor') comisionParam: string,
    @Req() req: UsuarioRequest
  ) {
    const comisionVendedor = parseFloat(comisionParam);
    if (Number.isNaN(comisionVendedor) || comisionVendedor < 0) {
      throw new BadRequestException('Comisión inválida');
    }

    return this.pedidosService.asignarComisionVendedor(
      pedidoId,
      comisionVendedor,
      req.usuario
    );
  }
  @Roles('admin')
  @Get('manifiestos/fusionar/:pedidoId')
  async fusionarManifiestos(
    @Param('pedidoId') pedidoId: string,
    @Res() res: Response
  ) {
    try {
      const resultado =
        await this.pedidosService.fusionarManifiestosPedido(pedidoId);

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="manifiestos_pedido_${pedidoId}.pdf"`
      );
      res.setHeader('Content-Length', resultado.buffer.length.toString());

      // Enviar el buffer
      res.send(resultado.buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        // error: error?.message ?? 'Error desconocido',
      });
    }
  }
  @Roles('admin')
  @Get('pedidoPorId/:pedidoId')
  async obtenerPedidoPorId(
    @Param('pedidoId') pedidoId: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.pedidosService.obtenerPedidoPorId(pedidoId, usuario);
  }
}
