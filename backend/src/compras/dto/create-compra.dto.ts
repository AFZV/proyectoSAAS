import {
  IsString,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductosCompra {
  @IsString()
  idProducto: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreateCompraDto {
  @IsString()
  idProveedor: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos un producto en la compra' })
  @ValidateNested({ each: true })
  @Type(() => ProductosCompra)
  ProductosCompras: ProductosCompra[];
}
