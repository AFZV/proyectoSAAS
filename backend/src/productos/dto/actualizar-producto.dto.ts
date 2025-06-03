import {
  IsString,
  IsNumber,
  IsUrl,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';

export class UpdateProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precioCompra: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsString()
  categoria: string;

}
