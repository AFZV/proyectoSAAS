import { CreateProductoDto } from './create-producto.dto';
import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsIn, IsOptional } from 'class-validator';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  // Slots que el usuario quitó explícitamente en esta edición (sin subir un reemplazo).
  // Distinto de omitir el campo: omitir = "no toques esta imagen", listar un slot aquí =
  // "bórrala de verdad".
  @IsOptional()
  @IsArray()
  @IsIn(['image1', 'image2', 'image3'], { each: true })
  imagenesEliminadas?: ('image1' | 'image2' | 'image3')[];
}
