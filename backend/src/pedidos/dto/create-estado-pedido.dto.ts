import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearEstadoPedidoDto {
  @IsUUID()
  pedidoId: string;

  @IsString()
  estado: string;

  @IsOptional()
  @IsString()
  guiaTransporte: string;

  @IsOptional()
  @IsString()
  flete: number;
}
