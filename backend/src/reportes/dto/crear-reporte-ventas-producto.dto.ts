import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CrearReporteVentasProductoDto {
  @IsString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsString()
  @IsNotEmpty()
  fechaFin: string;

  @IsString()
  @IsOptional()
  productoId?: string;
}
