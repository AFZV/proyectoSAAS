import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearInventarioDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockReferenciaOinicial: number;

}