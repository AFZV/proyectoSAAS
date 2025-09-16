import { Injectable } from '@nestjs/common';
import { CreatePagoProveedorDto } from './dto/create-pagos-proveedor.dto';
//import { UpdatePagosProveedorDto } from './dto/update-pagos-proveedor.dto';

@Injectable()
export class PagosProveedorService {
  create(CreatePagoProveedorDto: CreatePagoProveedorDto) {
    const data = CreatePagoProveedorDto;
    console.log('Crear pago proveedor:', data);
    return 'This action adds a new pagosProveedor';
  }

  findAll() {
    return `This action returns all pagosProveedor`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pagosProveedor`;
  }

  //update(id: number, updatePagosProveedorDto: UpdatePagosProveedorDto) {
  //   return `This action updates a #${id} pagosProveedor`;
  // }

  remove(id: number) {
    return `This action removes a #${id} pagosProveedor`;
  }
}
