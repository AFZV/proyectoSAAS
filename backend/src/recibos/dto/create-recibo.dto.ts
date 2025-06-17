import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class PedidoAbonadoDto {
  @IsNotEmpty()
  @IsString()
  pedidoId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'El valor aplicado debe ser mayor a 0' })
  valorAplicado: number;
}

export class CrearReciboDto {
  @IsNotEmpty()
  @IsString()
  clienteId: string;

  @IsNotEmpty()
  @IsString()
  tipo: string;

  @IsNotEmpty()
  @IsString()
  concepto: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoAbonadoDto)
  pedidos: PedidoAbonadoDto[];
}
