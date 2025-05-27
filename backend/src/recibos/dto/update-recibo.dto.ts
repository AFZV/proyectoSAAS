import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateReciboDto {
  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  concepto?: string;
}
