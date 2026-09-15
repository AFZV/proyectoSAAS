// src/empresa-config/dto/update-empresa-config.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmpresaConfigDto {
  // "" es válido a propósito (permite borrar la nota dejando el campo en blanco)
  @IsOptional()
  @IsString()
  @MaxLength(600)
  notaFactura?: string;
}
