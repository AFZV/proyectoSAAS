// pedidos/dto/get-pedidos-paginados.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPedidosPaginadosDto {
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
  estado?: string; // "GENERADO", "ENVIADO", etc. o "todos"

  @IsOptional()
  @IsString()
  q?: string; // búsqueda texto
}
