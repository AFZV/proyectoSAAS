// src/catalogo-publico/catalogo-publico.controller.ts
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductosService } from 'src/productos/productos.service';
import { verifyCatalogShareToken } from 'src/lib/catalogShareToken';

// Endpoint público: sin UsuarioGuard, accesible por cualquiera que tenga el link firmado.
// Throttle propio y más estricto que el global (200/min) porque no hay autenticación de por medio.
@Throttle({ default: { ttl: 60000, limit: 60 } })
@Controller('public/catalogo')
export class CatalogoPublicoController {
  constructor(private productosService: ProductosService) {}

  /**
   * GET /public/catalogo/:token
   * Devuelve productos + config de marca de la empresa dueña del link,
   * validando la firma y expiración del token (48h desde que se generó).
   */
  @Get(':token')
  async obtenerCatalogoPublico(@Param('token') token: string) {
    const payload = verifyCatalogShareToken(token);
    if (!payload) {
      throw new NotFoundException('El enlace no es válido o ya expiró');
    }

    return this.productosService.obtenerCatalogoPublicoPorEmpresa(
      payload.empresaId
    );
  }
}
