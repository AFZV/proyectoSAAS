import {
  IsString,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClienteExcelDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  id: string;

  @IsString()
  nit: string;

  @IsString()
  rasonZocial: string;

  @IsString()
  nombre: string;

  @IsString()
  apellidos: string;

  @IsString()
  telefono: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  direccion: string;

  @IsString()
  departamento: string;

  @IsString()
  ciudad: string;

  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string')
      return value.toLowerCase() === 'true' || value === '1';
    if (typeof value === 'number') return value === 1;
    return false;
  })
  estado: boolean;

  @IsString()
  vendedor: string; // este debe mapearse al usuarioId del vendedor si lo tienes
}
