import {
  Controller,
  Get,
  Post,
  Body,
  //Patch,
  Param,
  Delete,
  UnauthorizedException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PagosProveedorService } from './pagos-proveedor.service';
import { CreatePagoProveedorDto } from './dto/create-pagos-proveedor.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
//import { UpdatePagosProveedorDto } from './dto/update-pagos-proveedor.dto';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('pagos-proveedor')
export class PagosProveedorController {
  constructor(private readonly pagosProveedorService: PagosProveedorService) {}

  @Post('create')
  create(@Body() data: CreatePagoProveedorDto, @Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    if (!usuario) throw new UnauthorizedException('no autenticado');
    return this.pagosProveedorService.create(data, usuario);
  }

  @Get()
  findAll() {
    return this.pagosProveedorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosProveedorService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePagosProveedorDto: UpdatePagosProveedorDto) {
  //   return this.pagosProveedorService.update(+id, updatePagosProveedorDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pagosProveedorService.remove(+id);
  }
}
