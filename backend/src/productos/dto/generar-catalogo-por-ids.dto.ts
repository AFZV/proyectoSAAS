// src/productos/dto/generar-catalogo-por-ids.dto.ts
import { IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarCatalogoPorIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  productoIds!: string[];
}
