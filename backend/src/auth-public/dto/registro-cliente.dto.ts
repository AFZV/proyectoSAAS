import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class RegistroClienteDto {
    @IsString()
    @IsNotEmpty()
    nit: string;

    @IsString()
    @IsOptional()
    razonSocial?: string;

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    apellidos: string;

    @IsString()
    @IsNotEmpty()
    telefono: string;

    @IsEmail({}, { message: 'Debe ser un email válido' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    direccion: string;

    @IsString()
    @IsNotEmpty()
    departamento: string;

    @IsString()
    @IsNotEmpty()
    ciudad: string;

    @IsString()
    @IsNotEmpty()
    empresaId: string;

    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    password: string;
}
