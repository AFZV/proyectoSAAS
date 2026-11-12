// src/productos/dto/update-catalogo-config.dto.ts
import {
  IsBoolean,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// El frontend puede mandar "" en un campo que el usuario no tocó (no lo borró, simplemente
// nunca lo llenó). @IsOptional() de class-validator solo salta la validación si el valor es
// null/undefined, NO si es "" — por eso lo normalizamos a undefined antes de validar, para que
// de verdad todos los campos sean opcionales y no exijan "algo válido" para poder guardar.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class UpdateCatalogoConfigDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsHexColor()
  colorPrimario?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsHexColor()
  colorSecundario?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl()
  bannerUrl?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(140)
  mensajeBienvenida?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  whatsappContacto?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  avisoDestacado?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsHexColor()
  colorFondo?: string;

  // Color del marco/margen detrás de la imagen del producto (la imagen se ve completa,
  // sin recortar — este color rellena el espacio sobrante alrededor).
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsHexColor()
  colorMarcoImagenes?: string;

  @IsOptional()
  @IsBoolean()
  mostrarPrecio?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrarStock?: boolean;

  // Si está activo, el catálogo público muestra carrito (varios productos) en vez de
  // un botón de WhatsApp por producto; al finalizar se envía todo el pedido en un solo mensaje.
  @IsOptional()
  @IsBoolean()
  permitirCarrito?: boolean;

  // Porcentaje que se suma sobre el precio base de venta SOLO en el catálogo público (no
  // afecta el precio interno). Vacío o 0 = se muestran los precios base, sin ajuste. Este
  // mismo porcentaje queda aplicado al precio con el que se crea el pedido importado desde
  // el link — ver src/lib/catalogoPrecio.ts.
  @IsOptional()
  @Transform(emptyToUndefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  porcentajeCatalogoPublico?: number;
}
