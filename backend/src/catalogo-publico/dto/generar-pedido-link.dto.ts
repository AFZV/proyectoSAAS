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
  @ArrayMaxSize(200) // límite razonable — evita tokens gigantes / abuso del endpoint público
  @ValidateNested({ each: true })
  @Type(() => ItemCarritoDto)
  items: ItemCarritoDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacionGeneral?: string;
}
