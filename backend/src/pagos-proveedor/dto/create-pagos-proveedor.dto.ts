// src/pagos-proveedor/dto/create-pago-proveedor.dto.ts
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { MetodoPagoProvEnum } from '@prisma/client';
// // Si NO quieres importar de Prisma, puedes declarar el enum así:
// export enum MetodoPagoProvEnum { EFECTIVO='EFECTIVO', TRANSFERENCIA='TRANSFERENCIA', TARJETA='TARJETA', CHEQUE='CHEQUE', OTRO='OTRO' }
class DetallePagoProveedorCreateDto {
  @IsUUID()
  facturaId!: string;

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'montoAplicado debe ser numérico' }
  )
  valor!: number;

  @IsOptional()
  nota?: string;
}
export class CreatePagoProveedorDto {
  @IsUUID()
  proveedorId!: string;

  // Opcional, el modelo tiene default(now())
  @IsOptional()
  @IsDateString({}, { message: 'fecha debe ser ISO 8601' })
  fecha?: string;

  @IsOptional()
  @IsString()
  moneda?: string; // default 'COP' en la BD

  // Obligatoria si moneda != 'COP'

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'tasaCambio debe ser numérica' }
  )
  tasaCambio?: number;

  @IsEnum(MetodoPagoProvEnum, { message: 'metodoPago inválido' })
  metodoPago!: MetodoPagoProvEnum;

  // Puedes dejarlo opcional si lo calculas como suma(detalles)
  // o hacerlo requerido si quieres forzarlo desde el cliente.
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'totalPagado debe ser numérico' }
  )
  totalPagado?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUrl({}, { message: 'comprobanteUrl debe ser una URL válida' })
  comprobanteUrl?: string;

  // El usuarioId normalmente lo inyectas desde el token en el backend
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  // Aplicaciones del pago a facturas
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DetallePagoProveedorCreateDto)
  detalles?: DetallePagoProveedorCreateDto[];
}
