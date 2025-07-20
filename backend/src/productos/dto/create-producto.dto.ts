import {
  IsString,
  IsNumber,
  IsUrl,
  Min,
  IsUUID,
  IsOptional,
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

  @IsUrl()
  imagenUrl: string;

  @IsUUID()
  @IsString()
  categoriaId: string;

  @IsOptional()
  @IsString()
  manifiestoUrl: string;
  @IsOptional()
  @IsString()
  descripcion: string;
}

//  id          String   @id @default(uuid())
//   codigo      Int      @default(autoincrement())
//   nombre      String   @db.Text
//   precioCompra      Float    @db.DoublePrecision
//   precioVenta      Float    @db.DoublePrecision
//   categoriaId String ?
//   imagenUrl   String   @db.Text
//   fechaCreado      DateTime @default(now())
//   fechaActualizado DateTime @updatedAt
//   estado String @db.Text
//   manifiestoUrl     String?   @db.Text // ← NUEVO CAMPO OPCIONAL
