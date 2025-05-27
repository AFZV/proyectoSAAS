// src/empresa/dto/update-empresa.dto.ts
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmpresaDto {
  @IsString()
  @IsOptional()
  nit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  razonSocial?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombreComercial?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsEmail()
  @IsOptional()
  correo?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}
