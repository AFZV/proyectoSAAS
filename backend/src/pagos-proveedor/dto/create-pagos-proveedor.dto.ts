// src/pagos-proveedor/dto/create-pago-proveedor.dto.ts
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPagoProvEnum } from '@prisma/client';

// ===== Detalle (sin pagoId) =====
export class DetallePagoFacturaDto {
  @IsUUID()
  facturaId: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01, { message: 'valor debe ser > 0' })
  valor: number;

  // Opcional: si manejas retención/bono línea a línea
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0, { message: 'descuento no puede ser negativo' })
  descuento?: number;
}

// ===== Pago =====
export class CreatePagoProveedorDto {
  @IsUUID()
  proveedorId: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha debe ser ISO 8601' })
  fecha?: string; // el modelo tiene default(now())

  @IsOptional()
  @IsString()
  moneda?: string; // default 'COP' en BD

  // Obligatoria si moneda != 'COP' (regla se valida en servicio o con custom validator)
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'tasaCambio debe ser numérica' }
  )
  tasaCambio?: number;

  @IsEnum(MetodoPagoProvEnum, { message: 'metodoPago inválido' })
  metodoPago: MetodoPagoProvEnum;

  // Se puede ignorar y calcular en backend como suma(neto por detalle)
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

  // ===== NUEVO: array de facturas a pagar/abonar =====
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Debe incluir al menos una factura a abonar' })
  @Type(() => DetallePagoFacturaDto)
  detalles: DetallePagoFacturaDto[];
}
