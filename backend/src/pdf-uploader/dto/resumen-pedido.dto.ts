import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResumenPedidoDto {
  @IsString()
  id: string;

  @IsString()
  cliente: string;

  @IsString()
  nitCliente: string; // NIT o C.C.

  @IsString()
  direccionCliente: string;

  @IsString()
  ciudadCliente: string;

  @IsString()
  departamentoCliente: string;

  @IsString()
  telefonoCliente: string;

  @IsString()
  emailCliente: string;

  @IsString()
  vendedor: string;

  @IsString()
  observaciones: string;

  @IsDate()
  @Type(() => Date)
  fecha: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoResumenDto)
  productos: ProductoResumenDto[];

  @IsNumber()
  total: number;
  @IsOptional()
  @IsNumber()
  diasCredito?: number;

  @IsString()
  logoUrl: string;

  @IsString()
  nombreEmpresa: string;

  @IsString()
  direccionEmpresa: string;

  @IsString()
  telefonoEmpresa: string;

  @IsOptional()
  @IsNumber()
  totalUnidades?: number;

  @IsOptional()
  @IsNumber()
  totalPesoKg?: number;

  @IsOptional()
  @IsNumber()
  totalCubicajeM3?: number;
}

export class ProductoResumenDto {
  @IsString()
  nombre: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio: number;

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsNumber()
  bultosEquivalentes?: number; // cantidad / unidadesPorBulto

  @IsOptional()
  @IsNumber()
  pesoTotal?: number; // bultosEquivalentes * pesoPorBulto

  @IsOptional()
  @IsNumber()
  cubicajeTotal?: number; // bultosEquivalentes * cubicajePorBulto
}
