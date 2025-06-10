import { IsNotEmpty, IsString } from 'class-validator';

export class FilterPedidoDto {
  @IsString()
  @IsNotEmpty()
  tipoFiltro: string;

  @IsString()
  @IsNotEmpty()
  filtro: string;
}
