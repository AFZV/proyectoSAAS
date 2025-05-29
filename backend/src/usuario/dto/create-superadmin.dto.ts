import {
  IsEmail,
  IsString,
  Length,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class CreateSuperadminDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @Length(2, 50, { message: 'El nombre debe tener entre 2 y 50 caracteres.' })
  nombre: string;

  @IsString()
  @Length(2, 50, {
    message: 'Los apellidos deben tener entre 2 y 50 caracteres.',
  })
  apellidos: string;

  @Matches(/^[0-9]{7,10}$/, {
    message:
      'El teléfono debe contener solo números y tener entre 7 y 10 dígitos.',
  })
  telefono: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  correo: string;

  @IsString()
  @IsNotEmpty()
  rol: string;

  @IsString()
  @IsNotEmpty()
  estado: string;
}
