import { IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class UpdateProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precioCompra: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsUUID()
  @IsString()
  categoriaId: string;
}
