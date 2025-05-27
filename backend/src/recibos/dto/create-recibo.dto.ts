import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CrearReciboDto {
  @IsNotEmpty()
  @IsString()
  nit: string; // NIT del cliente para buscarlo

  @IsNotEmpty()
  @IsNumber()
  valor: number;

  @IsNotEmpty()
  @IsString()
  tipo: string;

  @IsNotEmpty()
  @IsString()
  concepto: string;
}
