import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ClientesPublicService } from './clientes-public.service';

@Controller('clientes/public')
export class ClientesPublicController {
    constructor(private clientesPublicService: ClientesPublicService) { }

    /**
     * GET /clientes/public/existe?nit=123456789
     * Verificar si un NIT existe (endpoint público, sin autenticación)
     */
    @Get('existe')
    async verificarNitExistente(@Query('nit') nit: string) {
        if (!nit) {
            throw new BadRequestException('El parámetro NIT es requerido');
        }

        return this.clientesPublicService.verificarNitExistente(nit);
    }

    /**
     * GET /clientes/public/empresas
     * Listar empresas disponibles para registro (endpoint público)
     */
    @Get('empresas')
    async listarEmpresasPublicas() {
        return this.clientesPublicService.listarEmpresasPublicas();
    }
}
