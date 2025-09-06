import {
  Controller,
  Get,
  Post,
  Body,
  //  Patch,
  Param,
  Delete,
  UnauthorizedException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FacturasProveedorService } from './facturas-proveedor.service';
import { CreateFacturasProveedorDto } from './dto/create-facturas-proveedor.dto';
//import { UpdateFacturasProveedorDto } from './dto/update-facturas-proveedor.dto';
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { UsuarioGuard } from 'src/common/guards/usuario.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
@UseGuards(UsuarioGuard, RolesGuard)
@Roles('admin')
@Controller('facturas-proveedor')
export class FacturasProveedorController {
  constructor(
    private readonly facturasProveedorService: FacturasProveedorService
  ) {}

  @Post('create')
  create(
    @Body() createFacturasProveedorDto: CreateFacturasProveedorDto,
    @Req() req: UsuarioRequest
  ) {
    const usuario = req.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.facturasProveedorService.create(
      createFacturasProveedorDto,
      usuario.empresaId
    );
  }

  @Get()
  findAll() {
    return this.facturasProveedorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturasProveedorService.findOne(+id);
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateFacturasProveedorDto: UpdateFacturasProveedorDto
  // ) {
  //   return this.facturasProveedorService.update(
  //     +id,
  //     updateFacturasProveedorDto
  //   );
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facturasProveedorService.remove(+id);
  }
}
