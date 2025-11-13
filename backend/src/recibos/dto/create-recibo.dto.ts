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

class PedidoAbonadoDto {
  @IsNotEmpty()
  @IsString()
  pedidoId: string;

  // Coerciona a number si viene como string: "12000" -> 12000
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'El valor aplicado debe ser mayor a 0' })
  valorAplicado: number;

  // 👇 Nuevos campos
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El flete no puede ser negativo' })
  flete?: number; // defaultéalo a 0 en el service si viene undefined

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  descuento?: number; // defaultéalo a 0 en el service si viene undefined
}

export class CrearReciboDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoAbonadoDto)
  pedidos: PedidoAbonadoDto[];
}
