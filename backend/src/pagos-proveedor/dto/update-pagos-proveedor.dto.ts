import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoProveedorDto } from './create-pagos-proveedor.dto';

export class UpdatePagosProveedorDto extends PartialType(
  CreatePagoProveedorDto
) {}
