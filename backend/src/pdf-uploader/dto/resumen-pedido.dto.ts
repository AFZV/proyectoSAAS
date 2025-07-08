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
  vendedor: string;

  @IsString()
  logoUrl: string;

  @IsString()
  nombreEmpresa: string;

  @IsString()
  direccionEmpresa: string;

  @IsString()
  telefonoEmpresa: string;
  @IsString()
  ciudadCliente: string;
  @IsString()
  emailCliente: string;
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
