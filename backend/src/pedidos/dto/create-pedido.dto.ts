import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePedidoDto {
  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  //   @IsNumber()
  //   @IsNotEmpty() //ESTE TOTAL ES EL VALOR TOTAL DEL PEDIDO se calcula en backend
  //   total: number;

  //   @IsString()
  //   @IsNotEmpty()  ////ESTE SE ENVIA POR MEDIO DEL QUE ESTE LOGUEADO TOMANDO EL PEDIDO
  //   empresaId: string;

  @IsString()
  @IsOptional()
  observaciones: string;

  //   @Type(() => Date)    LO GETIONA PRISMA
  //   @IsNotEmpty()
  //   fechaEnvio: Date;
  @IsOptional()
  @IsString()
  guiaTransporte: string;

  @IsOptional()
  @IsString()
  flete: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleProductoDto) //ARRAY DE PRODUCTOS
  productos: DetalleProductoDto[];
}

class DetalleProductoDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @IsNumber()
  @IsNotEmpty()
  precio: number;
}
