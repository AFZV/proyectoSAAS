import {
  IsString,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// "" no es undefined para @IsOptional() — la normalizamos antes de validar para que
// el campo sea realmente opcional y no guarde una nota vacía en vez de null.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

class ProductosCompra {
  @IsString()
  idProducto: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precio: number;
}

export class CreateCompraDto {
  @IsString()
  idProveedor: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos un producto en la compra' })
  @ValidateNested({ each: true })
  @Type(() => ProductosCompra)
  ProductosCompras: ProductosCompra[];
}
