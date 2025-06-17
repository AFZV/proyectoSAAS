import { IsString } from 'class-validator';

export class CreateCategoriaProductoDto {
  @IsString()
  nombre: string;
}
