// src/catalogo-publico/dto/generar-pedido-link.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ItemCarritoDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class GenerarPedidoLinkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200) // límite razonable — evita tokens gigantes / abuso del endpoint público
  @ValidateNested({ each: true })
  @Type(() => ItemCarritoDto)
  items: ItemCarritoDto[];
}
