// recibos/dto/get-recibos-paginados.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecibosPaginadosDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limite: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // busca por NIT, nombre o apellidos del cliente

  @IsOptional()
  @IsIn(['fecha', 'nombre', 'revisado'])
  sortBy?: 'fecha' | 'nombre' | 'revisado' = 'fecha';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
