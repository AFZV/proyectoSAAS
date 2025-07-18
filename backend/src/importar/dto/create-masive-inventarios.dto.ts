import { IsNumber, Min, IsUUID } from 'class-validator';

export class CreateMasiveInventariosDto {
  @IsUUID()
  idProducto: string;

  @IsNumber()
  @Min(1)
  stock: number;
}
