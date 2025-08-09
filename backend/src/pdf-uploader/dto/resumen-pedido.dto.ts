import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  ValidateNested,
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

  @IsDate()
  @Type(() => Date)
  fecha: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoResumenDto)
  productos: ProductoResumenDto[];

  @IsNumber()
  total: number;

  @IsString()
  logoUrl: string;

  @IsString()
  nombreEmpresa: string;

  @IsString()
  direccionEmpresa: string;

  @IsString()
  telefonoEmpresa: string;
}

export class ProductoResumenDto {
  @IsString()
  nombre: string; // Nombre del producto

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio: number;

  @IsNumber()
  subtotal: number; // cantidad * precio
}
