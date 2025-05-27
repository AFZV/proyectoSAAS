import { IsString, IsNumber, IsUrl, IsUUID, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsString()
  categoria: string;

  @IsUrl()
  imagenUrl: string;

  @IsUUID()
  empresaId: string;
}
