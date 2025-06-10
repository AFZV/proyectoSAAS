import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PedidoAbonadoDto {
  @IsNotEmpty()
  @IsString()
  pedidoId: string;

  @IsNotEmpty()
  @IsNumber()
  valorAplicado: number;
}

export class CrearReciboDto {
  @IsNotEmpty()
  @IsString()
  clienteId: string;

  @IsNotEmpty()
  @IsString()
  tipo: string;

  @IsNotEmpty()
  @IsString()
  concepto: string;

  @IsNotEmpty()
  @IsNumber()
  valorTotal: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoAbonadoDto)
  pedidos: PedidoAbonadoDto[];
}

//modelo recibo
// id          String   @id @default(uuid())//se genera automaticamente
// clienteId   String
// usuarioId   String  //se asigna al usuariario al que pertenece el cliente
// tipo        String   @db.Text  // efectivo consignacion
// concepto    String   @db.Text // descripcion
// Fechacrecion      DateTime @default(now())/// se calcula automaticamente
// empresaId String /// se extrae del request del usuario logueado

// model DetalleRecibo{
//   idDetalleRecibo String   @id @default(uuid())/// segenera automatico
//   idPedido String   /// s ele asigna un id de pedido
//   idRecibo String  //relacion con el recibo
//   valorTotal       Float    @db.DoublePrecision  valor total cobrado
//   estado     String @default("abonado") // o parcial, completo  // si con esto cancela un pedido o queda saldo
//   saldoPendiente Float? // opcional

//   pedido Pedido @relation(fields: [idPedido],references: [id])
//   recibo Recibo @relation(fields: [idRecibo],references: [id])
//   @@index([idRecibo])
//   @@index([idPedido])

// }
