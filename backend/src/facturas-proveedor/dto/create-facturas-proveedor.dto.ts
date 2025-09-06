import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { EstadoFacturaProvEnum } from '@prisma/client';

export class CreateFacturasProveedorDto {
  @IsString()
  @IsNotEmpty()
  proveedorId: string;

  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string; // ← string

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string; // ← string

  @IsOptional()
  @IsString()
  moneda?: string = 'COP';

  @IsOptional()
  @IsNumber()
  @Min(0)
  tasaCambio?: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsString()
  soporteUrl?: string;

  @IsOptional()
  @IsEnum(EstadoFacturaProvEnum)
  estado?: EstadoFacturaProvEnum = EstadoFacturaProvEnum.ABIERTA;

  // ⚠️ OJO: este campo NO va a FacturaProveedor. Úsalo solo si luego enlazas con FacturaCompra.
  @IsOptional()
  @IsString()
  compraId?: string;
}

// idFacturaProveedor String @id @default(uuid())  no es necesario es automático
// empresaId String  no es necesario es automático
// proveedorId String
// numero String @db.Text // número/nit del documento del proveedor
// fechaEmision DateTime @default(now())
// fechaVencimiento DateTime?
// moneda String @default("COP") // ISO 4217 ("COP", "USD"...)
// tasaCambio Float? @db.DoublePrecision // si moneda != COP

// total Float @default(0) @db.DoublePrecision
// saldo Float @default(0) @db.DoublePrecision// mantener por servicio

// estado EstadoFacturaProvEnum @default(ABIERTA)
// notas String? @db.Text
// soporteUrl String? @db.Text // PDF/imagen de la factura

// empresa Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade, onUpdate: Cascade)
// proveedor Proveedores @relation(fields: [proveedorId], references: [idProveedor], onDelete: Restrict, onUpdate: Cascade)

// pagos DetallePagoProveedor[]
// compras FacturaCompra[] // enlace opcional a Compras

// @@unique([empresaId, numero])
// @@index([proveedorId])
