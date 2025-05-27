import {
  Controller,
  Post,
  Body,
  Headers,
  ConflictException,
} from '@nestjs/common';
import { ClienteEmpresaService } from './cliente-empresa.service';

@Controller('cliente-empresa')
export class ClienteEmpresaController {
  constructor(private readonly clienteEmpresaService: ClienteEmpresaService) {}

  @Post()
  async asociarClienteEmpresa(
    @Body() data: { clienteId: string; empresaId: string; vendedorId: string },
    @Headers('authorization') authHeader: string,
  ) {
    return await this.clienteEmpresaService.asociar(data);
  }
}
