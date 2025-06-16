import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResumenPedidoDto {
  @IsString()
  id: string; // ID del pedido

  @IsString()
  cliente: string; // Nombre del cliente

  @IsDate()
  @Type(() => Date)
  fecha: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoResumenDto)
  productos: ProductoResumenDto[];

  @IsNumber()
  total: number;
  @IsString()
  vendedor: string;
}

export class ProductoResumenDto {
  @IsString()
  nombre: string; // Nombre del producto

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio: number;

  @IsNumber()
  subtotal: number; // cantidad * precio
}
