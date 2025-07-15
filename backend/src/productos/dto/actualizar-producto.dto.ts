import { CreateProductoDto } from './create-producto.dto';
import { PartialType } from '@nestjs/mapped-types';
export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
