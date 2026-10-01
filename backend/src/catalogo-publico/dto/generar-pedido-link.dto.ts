// src/catalogo-publico/dto/generar-pedido-link.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ItemCarritoDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

export class GenerarPedidoLinkDto {
  @IsArray()
  @ArrayMinSize(1)
  // El carrito ya no viaja en la URL (ver PedidoImportPendiente), así que esto NO es un
  // límite técnico — es solo un tope de sensatez contra abuso del endpoint público (nadie
  // manda 2000 productos en un pedido real). Antes aquí había 400 por tamaño de link; esa
  // razón ya no existe.
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ItemCarritoDto)
  items: ItemCarritoDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacionGeneral?: string;
}
