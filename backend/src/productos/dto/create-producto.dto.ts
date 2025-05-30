import {
  IsString,
  IsNumber,
  IsUrl,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';

export enum ProductoEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  AGOTADO = 'agotado',
  DISPONIBLE = 'disponible',
}

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsNumber()
  @Min(0)
  precioCompra: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsString()
  categoria: string;

  @IsUrl()
  imagenUrl: string;

  @IsEnum(ProductoEstado)
  estado: ProductoEstado;

  @IsUUID()
  empresaId: string;
}
