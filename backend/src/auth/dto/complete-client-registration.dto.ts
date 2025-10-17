import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CompleteClientRegistrationDto {
  @IsString()
  @IsNotEmpty({ message: 'Clerk User ID es requerido' })
  clerkUserId: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio.' })
  clienteId: string;

  @IsUUID()
  @IsOptional()
  empresaId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  rol: string;

  @IsString()
  telefono?: string;
}
