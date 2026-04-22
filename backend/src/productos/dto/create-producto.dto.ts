import {
  IsString,
  IsNumber,
  IsUrl,
  Min,
  IsUUID,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';
export enum ProductoEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  AGOTADO = 'agotado',
  DISPONIBLE = 'disponible',
}

export class ProductoImagenDto {
  @IsIn(['image1', 'image2', 'image3'])
  slot: 'image1' | 'image2' | 'image3';

  @IsString()
  url: string;
}

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsUrl()
  imagenUrl: string;

  @IsUUID()
  @IsString()
  categoriaId: string;

  @IsOptional()
  @IsString()
  manifiestoUrl?: string;
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsNumber()
  precioCompraExterior?: number;

  @IsOptional()
  @IsString()
  monedaCompraExterior?: string;

  @IsOptional()
  @IsNumber()
  unidadesPorBulto?: number;

  @IsOptional()
  @IsNumber()
  pesoPorBulto?: number;

  @IsOptional()
  @IsNumber()
  cubicajePorBulto?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoImagenDto)
  imagenes?: ProductoImagenDto[];

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  precioCompra: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  precioVenta: number;
}
