import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  Min,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO específico para pedidos en UPDATE — permite valorAplicado = 0
class PedidoAbonadoUpdateDto {
  @IsNotEmpty()
  @IsString()
  pedidoId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El valor aplicado no puede ser negativo' }) // FIX: Min(0) en lugar de Min(1)
  valorAplicado: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El flete no puede ser negativo' })
  flete?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  descuento?: number;
}

export class UpdateReciboDto {
  @IsNotEmpty()
  @IsString()
  clienteId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['efectivo', 'consignacion'], {
    message: 'tipo debe ser "efectivo" o "consignacion"',
  })
  tipo: string;

  @IsNotEmpty()
  @IsString()
  concepto: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoAbonadoUpdateDto)
  pedidos?: PedidoAbonadoUpdateDto[];
}
