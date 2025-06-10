import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';
export class CrearReporteInvDto {
  @Type(() => Date)
  @IsDate()
  fechaInicio: Date;

  @Type(() => Date)
  @IsDate()
  fechaFin: Date;
}