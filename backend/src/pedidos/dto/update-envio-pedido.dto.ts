import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateEnvioDto {
  @IsString()
  @IsOptional()
  guiaTransporte: string;

  @IsOptional()
  @IsNumber()
  flete: number;
}
