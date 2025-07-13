import { IsString, Length } from 'class-validator';
export class CrearReporteRangoProductoDto {
  @IsString()
  @Length(1, 1)
  inicio: string; // p.ej. 'A'

  @IsString()
  @Length(1, 1)
  fin: string; // p.ej. 'C'
}
