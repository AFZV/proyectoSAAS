import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleOrdenDto {
  @IsString()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  precioUnitario: number;

  @IsString()
  moneda: string;
}

export class CreateOrdenCompraDto {
  @IsString()
  proveedorId: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenDto)
  detalles: DetalleOrdenDto[];
}
