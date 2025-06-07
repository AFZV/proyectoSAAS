import { IsString, IsNumber, Min } from 'class-validator';

export class CreateCompraDto {
  @IsString()
  idProveedor: string;

  @IsString()
  idEmpresa: string;

  @IsString()
  idProducto: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

interface ProductosPedidos {}
