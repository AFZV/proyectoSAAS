import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearEstadoPedidoDto {
  @IsUUID()
  pedidoId: string;

  @IsString()
  estado: string;

  // //Agregar campos opcionales para guía de transporte y flete
  // @IsOptional()
  // @IsString()
  // guiaTransporte?: string;

  // @IsOptional()
  // @IsNumber()
  // flete?: number;
}
