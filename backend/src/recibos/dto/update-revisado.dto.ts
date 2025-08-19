// dto/update-revisado.dto.ts
import { IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRevisadoDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  revisado: boolean;
}
