import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AsignarPasswordDto {
    @IsString()
    @IsNotEmpty()
    nit: string;

    @IsString()
    @IsNotEmpty()
    empresaId: string;

    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    password: string;
}
