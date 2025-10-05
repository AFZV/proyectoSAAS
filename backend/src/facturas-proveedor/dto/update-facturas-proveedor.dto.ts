import { PartialType } from '@nestjs/mapped-types';
import { CreateFacturasProveedorDto } from './create-facturas-proveedor.dto';

export class UpdateFacturasProveedorDto extends PartialType(
  CreateFacturasProveedorDto
) {}
