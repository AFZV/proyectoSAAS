import { IsString } from 'class-validator';

export class CrearReporteClienteCiudadDto {
  @IsString() // opcional: quita espacios
  ciudad: string;
}
