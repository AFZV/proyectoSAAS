import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdenesCompraService } from './ordenes-compra.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsuarioRequest } from 'src/types/request-with-usuario';

@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly service: OrdenesCompraService) {}

  @Post()
  crear(@Body() body: CreateOrdenCompraDto, @Req() req: UsuarioRequest) {
    return this.service.crear(body, req.usuario);
  }

  @Get()
  listar(@Req() req: UsuarioRequest) {
    return this.service.listar(req.usuario);
  }

  @Get(':id')
  detalle(@Param('id') id: string, @Req() req: UsuarioRequest) {
    return this.service.detalle(id, req.usuario);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() body: UpdateOrdenCompraDto,
    @Req() req: UsuarioRequest,
  ) {
    return this.service.actualizar(id, body, req.usuario);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @Req() req: UsuarioRequest) {
    return this.service.eliminar(id, req.usuario);
  }

  @Get(':id/excel')
  async descargarExcel(
    @Param('id') id: string,
    @Req() req: UsuarioRequest,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generarExcel(id, req.usuario);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="OC-${id.slice(0, 8)}.xlsx"`,
    );
    res.send(buffer);
  }
}
