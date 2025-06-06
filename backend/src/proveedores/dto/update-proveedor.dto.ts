import { createProveedorDto } from './create-proveedor.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateProveedorDto extends PartialType(createProveedorDto) {}
