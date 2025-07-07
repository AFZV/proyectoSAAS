import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePedidoDto {
  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  @IsString()
  @IsOptional()
  observaciones: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleProductoDto) //ARRAY DE PRODUCTOS
  productos: DetalleProductoDto[];
}

class DetalleProductoDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @IsNumber()
  @IsNotEmpty()
  precio: number;
}
