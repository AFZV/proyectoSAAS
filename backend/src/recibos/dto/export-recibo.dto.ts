// src/reportes/dto/export-recaudos.dto.ts

import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ExportRecaudosDto {
  @IsNotEmpty({ message: 'La fecha inicial es obligatoria' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha inicial debe tener el formato YYYY-MM-DD',
  })
  fechaInicio: string;

  @IsNotEmpty({ message: 'La fecha final es obligatoria' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha final debe tener el formato YYYY-MM-DD',
  })
  fechaFin: string;
}
