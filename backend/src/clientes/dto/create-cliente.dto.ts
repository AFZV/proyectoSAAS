import {
  IsNotEmpty,
  IsString,
  IsEmail,
  Matches,
  Length,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty({ message: 'El NIT es obligatorio.' })
  @Matches(/^\d{5,20}$/, {
    message: 'El NIT debe tener solo números y entre 5 a 20 dígitos.',
  })
  nit: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @Length(2, 50, { message: 'El nombre debe tener entre 2 y 50 caracteres.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @Length(2, 50, {
    message: 'Los apellidos deben tener entre 2 y 50 caracteres.',
  })
  apellidos: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @Matches(/^\d{7,15}$/, {
    message: 'El teléfono debe tener entre 7 y 15 dígitos numéricos.',
  })
  telefono: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  direccion: string;

  @IsString()
  @IsNotEmpty({ message: 'El departamento es obligatorio.' })
  departamento: string;

  @IsString()
  @IsNotEmpty({ message: 'La ciudad es obligatoria.' })
  ciudad: string;

  @IsBoolean()
  @IsNotEmpty({
    message: 'El estado del cliente es obligatorio (activo/inactivo).',
  })
  estado: boolean;

  // Relaciones (se usan luego para insertar en ClienteEmpresa)
  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la empresa es obligatorio.' })
  empresaId: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El ID del vendedor (usuario) es obligatorio.' })
  usuarioId: string;
}
