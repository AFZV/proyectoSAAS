// update-compra.dto.ts
import {
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductosCompraUpdateDto {
  @IsString()
  idProducto: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precio: number; // 👈 AGREGAR PRECIO TAMBIÉN EN UPDATE
}

export class UpdateCompraDto {
  @IsOptional()
  @IsString()
  idProveedor?: string; // Opcional en update

  // Sin transform de "" -> undefined a propósito: si el campo viene en el body
  // (aunque sea "") significa "el usuario tocó el textarea", y "" debe borrar la
  // observación (guardarla null), no dejar la anterior intacta.
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductosCompraUpdateDto)
  ProductosCompras: ProductosCompraUpdateDto[];
}
