import { IsString, IsNumber, Min, IsUUID, IsOptional } from 'class-validator';

export class CreateMasiveProductoDto {
  @IsOptional()
  @IsString()
  nombre: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCompra: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVenta: number;
  @IsOptional()
  @IsUUID()
  @IsString()
  categoriaId: string;
}
