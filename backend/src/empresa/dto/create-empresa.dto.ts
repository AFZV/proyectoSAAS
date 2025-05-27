import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @IsNotEmpty()
  nit: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  razonSocial: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombreComercial: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  departamento: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsEmail()
  correo: string;

  @IsString()
  @IsNotEmpty()
  logoUrl: string;
}
