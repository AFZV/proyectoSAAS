import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoOrdenCompra } from '@prisma/client';

export class UpdateOrdenCompraDto {
  @IsOptional()
  @IsEnum(EstadoOrdenCompra)
  estado?: EstadoOrdenCompra;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
