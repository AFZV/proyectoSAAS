import {
  Controller,
  Get,
  Post,
  Body,
  //Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PagosProveedorService } from './pagos-proveedor.service';
import { CreatePagoProveedorDto } from './dto/create-pagos-proveedor.dto';
//import { UpdatePagosProveedorDto } from './dto/update-pagos-proveedor.dto';

@Controller('pagos-proveedor')
export class PagosProveedorController {
  constructor(private readonly pagosProveedorService: PagosProveedorService) {}

  @Post()
  create(@Body() data: CreatePagoProveedorDto) {
    return this.pagosProveedorService.create(data);
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
