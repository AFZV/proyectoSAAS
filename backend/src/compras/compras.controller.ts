import {
  Controller,
  Body,
  Req,
  Post,
  UseGuards,
  Put,
  Param,
  Get,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { Response } from 'express';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  //crear una compra de un proveedor

  @Post('create')
  async create(@Body() data: CreateCompraDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const compra = await this.comprasService.create(usuario, data);
    return { message: `Se ha creado la compra ${compra.idCompra}`, compra };
  }
  //Actualizar una compra por su ID

  @Put('update/:idCompra')
  async update(
    @Param('idCompra') idCompra: string,
    @Body() data: UpdateCompraDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const compraActualizada = await this.comprasService.updateCompra(
      idCompra,
      usuario,
      data
    );
    return {
      message: `Se ha actualizado la compra ${idCompra}`,
      compraActualizada,
    };
  }

  //Obtener todas las compras de una empresa

  @Get('findAll/empresa')
  async findAll(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    const compras = await this.comprasService.findAll(usuario);
    return { compras };
  }

  //Obtener una compra por su ID
  @Roles('admin')
  @Get('find/:idCompra')
  async findById(
    @Param('idCompra') idCompra: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    const compra = await this.comprasService.findById(idCompra, usuario);
    return { compra };
  }
  @Post('recibir/:idCompra')
  async recibirCompra(
    @Param('idCompra') idCompra: string,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) throw new BadRequestException('Acceso no permitido');
    return await this.comprasService.recibir(idCompra, usuario);
  }
  @Get('preventa/pdf/:idCompra')
  async descargarPdfCompra(
    @Param('idCompra') idCompra: string,
    @Req() req: UsuarioRequest,
    @Res() res: Response
  ) {
    const usuario = req.usuario;

    const buffer = await this.comprasService.generarPdfCompra(
      idCompra,
      usuario
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=compra_${idCompra.slice(-8)}.pdf`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
