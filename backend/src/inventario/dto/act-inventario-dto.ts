import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ActInventarioDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockActual: number;

  @IsOptional()
  @IsString()
  observacion: string;
}
