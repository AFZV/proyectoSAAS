import { IsString, IsUUID } from 'class-validator';

export class CrearEstadoPedidoDto {
  @IsUUID()
  pedidoId: string;

  @IsString()
  estado: string;
}
